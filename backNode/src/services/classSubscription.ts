import { prisma } from "../../prisma/singletonPrisma.js";
import { SubscriptionStatus } from "@prisma/client";
import { Mailer } from "../infrastructure/mailer/classMailer.js";
import { generateInvoicePDF } from "../infrastructure/pdf/invoicePDF.js";

type ReturnData<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
};

function buildInvoiceNumber(idFacture: number, date: Date): string {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `LJ-${yyyymmdd}-${String(idFacture).padStart(4, "0")}`;
}

/** Utilisateur + entreprise nécessaires pour l'en-tête client d'une facture. */
type UserInvoiceInfo = {
  email: string;
  prenom: string | null;
  nom: string | null;
  enterprise: {
    name: string | null;
    siren: string | null;
    address: {
      address: string | null;
      codePostal: string | null;
      pays: string | null;
    } | null;
  } | null;
};

/** Select Prisma partagé par les deux chemins de facturation (email + download). */
const USER_INVOICE_SELECT = {
  email: true,
  prenom: true,
  nom: true,
  enterprise: {
    select: {
      name: true,
      siren: true,
      address: { select: { address: true, codePostal: true, pays: true } },
    },
  },
} as const;

/**
 * Construit l'en-tête client d'une facture (source unique de vérité).
 * Priorité à l'entreprise : si `enterprise.name` est présent, la facture est
 * établie à son nom avec son adresse (rue, CP/pays) et son SIREN ; sinon,
 * fallback sur le nom/prénom de la personne (ou l'email en dernier recours).
 * L'adresse n'est ajoutée que si au moins une ligne est connue.
 */
function buildCustomerInvoiceInfo(user: UserInvoiceInfo): {
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
} {
  const enterprise = user.enterprise;
  const personName =
    [user.prenom, user.nom].filter(Boolean).join(" ") || user.email;
  const customerName = enterprise?.name || personName;

  const addressLines: string[] = [];
  if (enterprise?.address?.address) addressLines.push(enterprise.address.address);
  const cpPays = [enterprise?.address?.codePostal, enterprise?.address?.pays]
    .filter(Boolean)
    .join(" ");
  if (cpPays) addressLines.push(cpPays);
  if (enterprise?.siren) addressLines.push(`SIREN : ${enterprise.siren}`);
  const customerAddress = addressLines.length
    ? addressLines.join("\n")
    : undefined;

  return {
    customerName,
    customerEmail: user.email,
    ...(customerAddress ? { customerAddress } : {}),
  };
}

export class Subscription {
  async createOrUpdate(
    userId: number,
    planName: string,
    interval: string,
    chargedAmountCents: number,
    stripePaymentIntentId?: string,
  ): Promise<ReturnData> {
    try {
      const plan = await prisma.plan.findFirst({
        where: { name: planName, interval },
      });

      if (!plan) {
        return {
          success: false,
          message: `Plan "${planName}" (${interval}) introuvable en BDD.`,
        };
      }

      const user = await prisma.user.findUnique({
        where: { idUser: userId },
        select: USER_INVOICE_SELECT,
      });

      if (!user) {
        return { success: false, message: "Utilisateur introuvable." };
      }

      const now = new Date();
      const expiresAt =
        interval === "year"
          ? new Date(new Date(now).setFullYear(now.getFullYear() + 1))
          : new Date(new Date(now).setMonth(now.getMonth() + 1));

      const subscription = await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId: plan.idPlan,
          status: SubscriptionStatus.ACTIVE,
          startAt: now,
          expiresAt,
        },
        update: {
          planId: plan.idPlan,
          status: SubscriptionStatus.ACTIVE,
          startAt: now,
          expiresAt,
        },
      });

      const facture = await prisma.facture.create({
        data: {
          subscriptionId: subscription.idSubscription,
          price: chargedAmountCents,
          stripeInvoiceId: stripePaymentIntentId ?? `manual_${Date.now()}`,
        },
      });

      await prisma.userCredit.upsert({
        where: { userId },
        create: {
          userId,
          creditIncluded: plan.creditIncluded,
          creditAdded: 0,
        },
        update: {
          creditIncluded: plan.creditIncluded,
        },
      });

      // Envoi de la facture par email — mêmes infos client que le download.
      const invoiceNumber = buildInvoiceNumber(facture.idFacture, now);

      new Mailer(user.email)
        .sendInvoice(
          {
            invoiceNumber,
            date: now,
            ...buildCustomerInvoiceInfo(user),
            planName,
            interval,
            amountTTCCents: chargedAmountCents,
            stripePaymentIntentId,
          },
          user.prenom ?? undefined,
        )
        .catch((error) =>
          console.error(
            "Erreur lors de l'envoi de la facture par email:",
            error,
          ),
        );

      return { success: true, message: "Abonnement activé avec succès." };
    } catch (error) {
      console.error("CREATE SUBSCRIPTION ERROR:", error);
      return {
        success: false,
        message: "Erreur lors de l'activation de l'abonnement.",
      };
    }
  }

  async get(userId: number): Promise<ReturnData> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      });

      const credits = await prisma.userCredit.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return { success: true, data: { subscription: null, credits: null } };
      }

      return {
        success: true,
        data: {
          subscription: {
            status: subscription.status,
            planName: subscription.plan.name,
            price: subscription.plan.price,
            interval: subscription.plan.interval,
            startAt: subscription.startAt.toISOString(),
            expiresAt: subscription.expiresAt.toISOString(),
          },
          credits: credits
            ? {
                creditIncluded: credits.creditIncluded,
                creditAdded: credits.creditAdded,
                totalIncluded: subscription.plan.creditIncluded,
              }
            : null,
        },
      };
    } catch (error) {
      console.error("GET SUBSCRIPTION ERROR:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération de l'abonnement.",
      };
    }
  }

  /**
   * Liste les factures payées de l'utilisateur (via son abonnement), triées de
   * la plus récente à la plus ancienne. Renvoie une liste vide si l'utilisateur
   * n'a pas d'abonnement.
   */
  async listInvoices(userId: number): Promise<ReturnData> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: {
          plan: true,
          facture: {
            where: { status: "PAID" },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!subscription) {
        return { success: true, data: [] };
      }

      const data = subscription.facture.map((f) => ({
        id: f.idFacture,
        invoiceNumber: buildInvoiceNumber(f.idFacture, f.createdAt),
        date: f.createdAt.toISOString(),
        amountCents: f.price,
        status: f.status,
        planName: subscription.plan.name,
      }));

      return { success: true, data };
    } catch (error) {
      console.error("LIST INVOICES ERROR:", error);
      return {
        success: false,
        message: "Erreur lors de la récupération des factures.",
      };
    }
  }

  /**
   * Régénère le PDF d'une facture appartenant à l'utilisateur. Renvoie `null`
   * si la facture n'existe pas ou n'appartient pas à l'abonnement de
   * l'utilisateur (contrôle d'accès).
   */
  async getInvoicePdf(
    userId: number,
    idFacture: number,
  ): Promise<{ buffer: Buffer; invoiceNumber: string } | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!subscription) return null;

    const facture = await prisma.facture.findFirst({
      where: { idFacture, subscriptionId: subscription.idSubscription },
    });
    if (!facture) return null;

    const user = await prisma.user.findUnique({
      where: { idUser: userId },
      select: USER_INVOICE_SELECT,
    });
    if (!user) return null;

    const invoiceNumber = buildInvoiceNumber(facture.idFacture, facture.createdAt);

    const buffer = await generateInvoicePDF({
      invoiceNumber,
      date: facture.createdAt,
      ...buildCustomerInvoiceInfo(user),
      planName: subscription.plan.name,
      interval: subscription.plan.interval,
      amountTTCCents: facture.price,
      stripePaymentIntentId: facture.stripeInvoiceId,
    });

    return { buffer, invoiceNumber };
  }

  async activateFreemium(userId: number): Promise<void> {
    try {
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId },
      });
      if (existingSubscription) return;

      const plan = await prisma.plan.findFirst({
        where: { name: "Freemium", interval: "month" },
      });
      if (!plan) {
        console.error("Plan Freemium introuvable en BDD");
        return;
      }

      const now = new Date();
      const expiresAt = new Date(new Date(now).setMonth(now.getMonth() + 1));

      await prisma.subscription.create({
        data: {
          userId,
          planId: plan.idPlan,
          status: SubscriptionStatus.ACTIVE,
          startAt: now,
          expiresAt,
        },
      });

      await prisma.userCredit.create({
        data: {
          userId,
          creditIncluded: plan.creditIncluded,
          creditAdded: 0,
        },
      });

      const user = await prisma.user.findUnique({
        where: { idUser: userId },
        select: { email: true, prenom: true },
      });

      if (user) {
        new Mailer(user.email)
          .sendWelcomeFreemium(user.prenom ?? undefined)
          .catch(console.error);
      }
    } catch (error) {
      console.error("activateFreemium error:", error);
    }
  }
}
