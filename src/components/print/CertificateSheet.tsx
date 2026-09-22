import { overlayLengthClass } from "@/lib/certificate-print";

export const CERTIFICATE_PRINT_CSS = `
  .certificate-sheet {
    position: relative;
    width: 100%;
    aspect-ratio: 1024 / 682;
    overflow: hidden;
    background: #fff;
    container-type: inline-size;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .certificate-sheet + .certificate-sheet {
    margin-top: 1.5rem;
  }
  .certificate-sheet img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .certificate-line {
    position: absolute;
    left: 16%;
    right: 16%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    text-align: center;
    color: #163a57;
    font-family: Georgia, "Times New Roman", serif;
    margin: 0;
    line-height: 1;
    text-decoration: none;
    overflow: visible;
    white-space: nowrap;
  }
  .certificate-line--name {
    top: 40.4%;
    height: 5.2%;
    font-size: 2.35cqw;
    font-weight: 600;
  }
  .certificate-line--org {
    top: 49.5%;
    height: 5.1%;
    font-size: 1.95cqw;
    font-weight: 600;
  }
  .certificate-line--name.is-medium { font-size: 1.95cqw; }
  .certificate-line--org.is-medium { font-size: 1.7cqw; }
  .certificate-line--name.is-long { font-size: 1.6cqw; }
  .certificate-line--org.is-long { font-size: 1.45cqw; }
  @media print {
    @page { size: A4 landscape; margin: 0; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    .certificate-print {
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .certificate-sheet {
      width: 297mm;
      height: 210mm;
      aspect-ratio: auto;
      page-break-after: always;
      break-after: page;
    }
    .certificate-sheet + .certificate-sheet {
      margin-top: 0;
    }
    .certificate-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .certificate-line {
      overflow: hidden;
      line-height: 1.15;
    }
    .certificate-line--name {
      top: 42%;
      height: 3.8%;
      font-size: 1.7rem;
      font-weight: 700;
    }
    .certificate-line--org {
      top: 51.1%;
      height: 3.7%;
      font-size: 1.35rem;
      font-weight: 600;
    }
    .certificate-line--name.is-medium { font-size: 1.35rem; }
    .certificate-line--org.is-medium { font-size: 1.15rem; }
    .certificate-line--name.is-long { font-size: 1.1rem; }
    .certificate-line--org.is-long { font-size: 0.98rem; }
  }
`;

export function CertificatePrintStyles() {
  return <style>{CERTIFICATE_PRINT_CSS}</style>;
}

export function CertificateSheet({
  memberName,
  stakeholderName,
  templateSrc = "/certificates/coastal-cleanup-2026.jpg",
}: {
  memberName: string;
  stakeholderName: string;
  templateSrc?: string;
}) {
  return (
    <article className="certificate-sheet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={templateSrc}
        alt="Appreciation certificate"
      />
      <p
        className={`certificate-line certificate-line--name ${overlayLengthClass(memberName)}`}
      >
        {memberName}
      </p>
      <p
        className={`certificate-line certificate-line--org ${overlayLengthClass(stakeholderName)}`}
      >
        {stakeholderName}
      </p>
    </article>
  );
}
