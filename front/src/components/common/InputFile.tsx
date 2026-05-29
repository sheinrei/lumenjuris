import { useDropzone } from "react-dropzone";
import { twMerge } from "tailwind-merge";
import { Upload } from "lucide-react";

interface InputFileProps {
  onDrop: (acceptedFiles: File[]) => void;
  fieldTitle?: string;
  fieldDescription?: string;
  supportedFileType?: string;
  fieldClassName?: string;
  iconClassName?: string;
  fieldTitleClassName?: string;
  fieldDescriptionClassName?: string;
  fileTypeClassName?: string;
  disabled?: boolean;
  accepted: Record<string, string[]>;
  multiple?: boolean;
}

/**
 * Zone de dépôt de fichier, construite sur `react-dropzone`, avec affichage d'une zone cliquable ou glisser-déposer.
 *
 * @example
 * ```tsx
 * <InputFile
 *   onDrop={(files) => handleFile(files[0])}
 *   accepted={{ "application/pdf": [".pdf"] }}
 *   fieldTitle="Importez votre contrat"
 *   supportedFileType="PDF"
 * />
 * ```
 *
 * @param onDrop            Callback appelé par `react-dropzone` avec la liste des fichiers
 *                          déposés ou sélectionnés. La validation MIME est déléguée à `accepted`.
 * @param fieldTitle        Titre affiché dans la zone (défaut : "Importez votre fichier").
 * @param fieldDescription  Texte d'aide sous le titre (défaut : "Cliquez ici ou glissez-déposez votre fichier").
 * @param supportedFileType Libellé des formats supportés affiché dans le badge (défaut : "tous formats").
 * @param fieldClassName    Classes Tailwind supplémentaires pour le conteneur principal.
 * @param iconClassName     Classes Tailwind supplémentaires pour le cercle d'icône.
 * @param fieldTitleClassName        Classes Tailwind supplémentaires pour le titre.
 * @param fieldDescriptionClassName  Classes Tailwind supplémentaires pour la description.
 * @param fileTypeClassName Classes Tailwind supplémentaires pour le badge de format.
 * @param disabled          Désactive l'interaction et applique un style `opacity-50` (défaut : `false`).
 * @param accepted          Dictionnaire MIME → extensions passé à `react-dropzone`.
 *                          Format : `{ "application/pdf": [".pdf"], "application/msword": [".doc"] }`.
 *                          Si l'objet est vide, aucun filtre MIME n'est appliqué.
 * @param multiple          Autorise la sélection de plusieurs fichiers simultanément (défaut : `false`).
 */
const InputFile = ({
  onDrop,
  fieldTitle = "Importez votre fichier",
  fieldDescription = "Cliquez ici ou glissez-déposez votre fichier",
  supportedFileType = "tous formats",
  fieldClassName,
  iconClassName,
  fieldTitleClassName,
  fieldDescriptionClassName,
  fileTypeClassName,
  disabled = false,
  accepted,
  multiple = false,
}: InputFileProps) => {
  // Props pour react-dropzone | Remplace les props de la balise <input/>
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    //accept: Object.keys(accepted).length > 0 ? accepted : undefined, Ajout de accepted && (si json vide cela reste true)
    accept: accepted && Object.keys(accepted).length ? accepted : undefined,
    disabled: disabled,
    multiple: multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={twMerge(
        `border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors has-disabled:opacity-50 has-disabled:cursor-not-allowed ${disabled ? "cursor-not-allowed" : "cursor-pointer"} ${fieldClassName}`,
      )}
    >
      <input {...getInputProps()} className="hidden" />
      <section>
        <div
          className={twMerge(
            `mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600 ${iconClassName}`,
          )}
        >
          <Upload className="w-8 h-8" />
        </div>
        <h3
          className={twMerge(
            `text-lg font-semibold text-gray-900 mb-2 ${fieldTitleClassName}`,
          )}
        >
          {fieldTitle}
        </h3>
        <p
          className={twMerge(`text-gray-500 mb-4 ${fieldDescriptionClassName}`)}
        >
          {fieldDescription}
        </p>
        <div>
          <span
            className={twMerge(
              `bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-400 ${fileTypeClassName}`,
            )}
          >
            {`📄 Format supporté : ${supportedFileType}`}
          </span>
        </div>
      </section>
    </div>
  );
};

export default InputFile;
