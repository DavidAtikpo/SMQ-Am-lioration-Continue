import {
  formatCordisteDescriptionForDisplay,
  isCordisteRecord,
  sanitizeCordisteText,
} from "@/lib/cordiste-text";

type CordisteRichTextProps = {
  id: string;
  text: string;
  className?: string;
};

export function CordisteRichText({ id, text, className = "" }: CordisteRichTextProps) {
  const cordiste = isCordisteRecord(id);
  const { summary, signatures } = cordiste
    ? formatCordisteDescriptionForDisplay(text)
    : { summary: sanitizeCordisteText(text), signatures: [] as string[] };

  return (
    <div className={className}>
      <div className="whitespace-pre-line text-sm font-semibold">{summary}</div>
      {signatures.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-3">
          {signatures.map((src, index) => (
            <figure
              key={`${id}-sig-${index}`}
              className="rounded-md border border-line bg-paper px-2 py-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Signature ${index + 1}`}
                className="max-h-14 max-w-[120px] object-contain"
              />
              <figcaption className="mt-0.5 text-center text-[10px] text-muted">
                Signature
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
