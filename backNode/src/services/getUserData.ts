import {
  ContractHistory,
  ContractHistoryItemDTO,
} from "./classContractHistory.js";

import { ChatHistory } from "./classChatHistory.js";
import { User, UserPreferenceDTO, UserPreferenceService } from "./classUser.js";
import { ClauseService, ClauseDTO } from "./classClause.js";
import { Subscription, ReturnData } from "./classSubscription.js";
import { ContractService, ContractListItemDTO } from "./classContract.js";
import {
  ContractTemplateService,
  ContractTemplateDTO,
} from "./classContractTemplate.js";
import {
  CompanyProfileService,
  CompanyProfileDTO,
} from "./classCompanyProfile.js";
import { FolderService, FolderDTO } from "./classFolder.js";
import { TagService, TagDTO } from "./classTag.js";
import {
  SignatureEnvelopeService,
  SignatureEnvelopeDTO,
} from "./classSignatureEnvelope.js";
import {
  NegotiationSessionDTO,
  NegotiationSessionService,
} from "./negotiation/classNegotiation.js";
import { DoctrinalNoteService } from "./classDoctrinalNote.js";

// TYPE GLOBAL D'EXPORTATION
export type UserFullExport = {
  exportedAt: Date;
  profile: any;
  enterprise: CompanyProfileDTO | null;
  preferences: UserPreferenceDTO | null;
  contracts: ContractListItemDTO[];
  doctrinalNotes: any[];
  folders: FolderDTO[]; // NOUVEAU
  tags: TagDTO[]; // NOUVEAU
  clauses: ClauseDTO[];
  templates: ContractTemplateDTO[];
  signatureEnvelopes: SignatureEnvelopeDTO[];
  subscription: ReturnData;
  chatHistory: any[];
  contractHistory: ContractHistoryItemDTO[];
  negotiationSessions: NegotiationSessionDTO[];
};

export async function getUserFullExport(
  userId: number,
): Promise<UserFullExport> {
  try {
    const [
      profileResult,
      enterprise,
      preferences,
      contracts,
      doctrinalNotes,
      clauses,
      folders,
      tags,
      templates,
      signatureEnvelope,
      subscription,
      chatHistoryResult,
      contractHistory,
      negotiationSession,
    ] = await Promise.all([
      new User().get(userId),
      CompanyProfileService.get(userId),
      UserPreferenceService.get(userId),
      new ContractService().list(userId, {}),
      new DoctrinalNoteService().getByUserId(userId),
      new ClauseService().list(userId),
      FolderService.list(userId),
      TagService.list(userId),
      new ContractTemplateService().list(userId),
      new SignatureEnvelopeService().list(userId),
      new Subscription().get(userId),
      new ChatHistory().get(userId),
      new ContractHistory().list(userId),
      new NegotiationSessionService().listForExport(userId),
    ]);

    if (!profileResult || !profileResult.data) {
      throw new Error("Utilisateur introuvable");
    }

    const {
      password,
      errorCatching,
      hashPassword,
      findById,
      enterprise: _,
      ...cleanProfile
    } = profileResult.data;

    const cleanSignatureEnvelopes = (signatureEnvelope || []).map(
      (envelope) => {
        const { signingToken, ...rest } = envelope;
        return {
          ...rest,
          signingToken: "",
        };
      },
    );

    const cleanSubscription = {
      ...subscription,
      stripeSubscriptionId: undefined,
      stripePriceId: undefined,
    };

    const cleanNegotiationSessions = (negotiationSession || []).map(
      (session) => {
        const { auditLogs, guestAccesses, ...rest } = session;

        return {
          ...rest,
          auditLogs: (auditLogs || []).map((log) => {
            const { payload, ...logRest } = log;

            const cleanPayload =
              payload && typeof payload === "object"
                ? { ...payload, token: undefined }
                : payload;

            return {
              ...logRest,
              payload: cleanPayload,
            };
          }),
          guestAccesses: (guestAccesses || []).map(
            ({ token, ...guestRest }) => ({
              ...guestRest,
              token: "",
            }),
          ),
        };
      },
    );

    return {
      exportedAt: new Date(),
      profile: cleanProfile,
      enterprise,
      preferences,
      contracts: contracts?.items || [],
      doctrinalNotes: doctrinalNotes || [],
      folders: folders || [],
      tags: tags || [],
      clauses: clauses || [],
      templates: templates || [],
      signatureEnvelopes: cleanSignatureEnvelopes,
      subscription: cleanSubscription,
      chatHistory: chatHistoryResult || [],
      contractHistory: contractHistory || [],
      negotiationSessions: cleanNegotiationSessions || [],
    };
  } catch (error) {
    console.error("Erreur dans getUserFullExport", error);
    throw error;
  }
}
