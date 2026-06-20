import fs from "fs";
import path from "path";

const domainArg = process.argv[2] || process.env.DOMAIN;
const EXPECTED_SPF = "v=spf1 include:secureserver.net -all";

if (!domainArg) {
  console.error("Usage: npm run generate-dns-fix -- <domain>");
  process.exit(1);
}
const domain = domainArg;

function buildZoneFile(domainName: string) {
  const origin = domainName.replace(/\s+/g, "");
  return [
    `; Vercel DNS zone recommendations for ${origin}`,
    `$ORIGIN ${origin}.`,
    `@ 3600 IN MX 0 smtp.secureserver.net.`,
    `@ 3600 IN MX 10 mailstore1.secureserver.net.`,
    `@ 3600 IN TXT "${EXPECTED_SPF}"`,
    `_dmarc 3600 IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc_rua@onsecureserver.net"`,
    `email 3600 IN CNAME email.secureserver.net.`,
    `secureserver1._domainkey 3600 IN CNAME s1._domainkey.secureserver.net.`,
    `secureserver2._domainkey 3600 IN CNAME s2._domainkey.secureserver.net.`,
  ].join("\n");
}

const zoneFile = buildZoneFile(domain);
const fileName = `${domain.replace(/\./g, "-")}-vercel-dns-fix.zone`;
const filePath = path.resolve(process.cwd(), "scripts", fileName);

fs.writeFileSync(filePath, zoneFile + "\n", { encoding: "utf8" });

console.log("GENERATED VERCEL DNS ZONE FILE");
console.log("=============================");
console.log(`Domain: ${domain}`);
console.log(`Saved to: ${filePath}`);
console.log("");
console.log(zoneFile);
console.log("");
console.log("Review the generated DNS zone file and import it into Vercel DNS manually.");
