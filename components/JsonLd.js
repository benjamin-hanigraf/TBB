// Structured data for search engines. The < sign is escaped so text can never break out of the script tag.
export default function JsonLd({ data }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />; }
