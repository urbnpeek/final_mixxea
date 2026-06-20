import dns from "dns/promises";

const domainArg = process.argv[2] || process.env.DOMAIN;
if (!domainArg) {
  console.error("Usage: npm run check-email-dns -- <domain>");
  process.exit(1);
}
const domain = domainArg;
const EXPECTED_MX = ["smtp.secureserver.net", "mailstore1.secureserver.net"];
const EXPECTED_SPF = "v=spf1 include:secureserver.net -all";
const REQUIRED_DKIM = ["secureserver1._domainkey", "secureserver2._domainkey"];
const EXPECTED_DMARC = { prefix: "v=DMARC1", policy: "p=reject" };

function normalizeHost(host: string): string {
  return host.trim().replace(/\.$/, "").toLowerCase();
}

function joinTxt(txt: string[][]): string[] {
  return txt.map((record) => record.join(""));
}

async function resolveMx(domainName: string) {
  try {
    return await dns.resolveMx(domainName);
  } catch (error) {
    return [];
  }
}

async function resolveTxtRecords(name: string) {
  try {
    return joinTxt(await dns.resolveTxt(name));
  } catch (error) {
    return [];
  }
}

async function resolveCname(name: string) {
  try {
    return await dns.resolveCname(name);
  } catch (error) {
    return [];
  }
}

function formatStatus(ok: boolean) {
  return ok ? "✔" : "❌";
}

function buildRecommendedZone(domainName: string) {
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

function analyzeSpf(txtRecords: string[]) {
  const spfRecords = txtRecords.filter((raw) => /^v=spf1/i.test(raw.trim()));
  if (spfRecords.length === 0) {
    return { ok: false, message: "Missing SPF record.", value: "" };
  }
  if (spfRecords.length > 1) {
    return { ok: false, message: "Multiple SPF records found.", value: spfRecords.join(" | ") };
  }
  const found = spfRecords[0].trim();
  const ok = found === EXPECTED_SPF;
  return {
    ok,
    message: ok ? "SPF record matches expected GoDaddy configuration." : "SPF record value is incorrect.",
    value: found,
  };
}

function analyzeDmarc(txtRecords: string[]) {
  if (txtRecords.length === 0) {
    return { ok: false, message: "Missing DMARC record.", value: "" };
  }
  const found = txtRecords[0].trim();
  const prefixOk = found.toUpperCase().includes(EXPECTED_DMARC.prefix.toUpperCase());
  const policyOk = found.toLowerCase().includes(EXPECTED_DMARC.policy.toLowerCase());
  const ok = prefixOk && policyOk;
  return {
    ok,
    message: ok ? "DMARC policy is configured for reject." : "DMARC record exists but does not enforce reject.",
    value: found,
  };
}

async function run() {
  const mxRecords = await resolveMx(domain);
  const mxHosts = mxRecords.map((record) => normalizeHost(record.exchange));
  const missingMx = EXPECTED_MX.filter((expected) => !mxHosts.includes(expected));
  const mxOk = missingMx.length === 0 && mxRecords.length > 0;

  const txtRecords = await resolveTxtRecords(domain);
  const spfResult = analyzeSpf(txtRecords);

  const dmarcRecords = await resolveTxtRecords(`_dmarc.${domain}`);
  const dmarcResult = analyzeDmarc(dmarcRecords);

  const dkimResults = await Promise.all(
    REQUIRED_DKIM.map(async (label) => {
      const recordName = `${label}.${domain}`;
      const values = await resolveCname(recordName);
      return {
        label,
        recordName,
        found: values.length > 0,
        values,
      };
    })
  );

  const missingDkim = dkimResults.filter((result) => !result.found).map((result) => result.label);
  const dkimOk = missingDkim.length === 0;

  const overallOk = mxOk && spfResult.ok && dkimOk && dmarcResult.ok;

  const missingRecords: string[] = [];
  if (!mxOk) missingRecords.push(`MX records missing or incorrect: ${missingMx.join(", ") || "no MX records found"}`);
  if (!spfResult.ok) missingRecords.push(`SPF issue: ${spfResult.message}`);
  if (!dkimOk) missingRecords.push(`DKIM records missing: ${missingDkim.join(", ")}`);
  if (!dmarcResult.ok) missingRecords.push(`DMARC issue: ${dmarcResult.message}`);

  console.log("EMAIL DNS DIAGNOSTIC REPORT");
  console.log("===========================\n");

  console.log("MX RECORDS:");
  console.log(`- Found: ${mxHosts.length > 0 ? mxHosts.join(", ") : "none"}`);
  console.log(`- Status: ${formatStatus(mxOk)} ${mxOk ? "OK" : "BROKEN"}`);
  if (!mxOk) console.log(`- Missing: ${missingMx.join(", ") || "smtp.secureserver.net, mailstore1.secureserver.net"}`);
  console.log("");

  console.log("SPF:");
  console.log(`- Found: ${spfResult.value || "none"}`);
  console.log(`- Status: ${formatStatus(spfResult.ok)} ${spfResult.ok ? "OK" : "BROKEN"}`);
  console.log(`- Note: ${spfResult.message}`);
  console.log("");

  console.log("DKIM:");
  for (const result of dkimResults) {
    console.log(`- ${result.label}: ${result.found ? `FOUND (${result.values.join(", ")})` : "MISSING"}`);
  }
  console.log(`- Status: ${formatStatus(dkimOk)} ${dkimOk ? "OK" : "BROKEN"}`);
  console.log("");

  console.log("DMARC:");
  console.log(`- Found: ${dmarcResult.value || "none"}`);
  console.log(`- Status: ${formatStatus(dmarcResult.ok)} ${dmarcResult.ok ? "OK" : "BROKEN"}`);
  console.log(`- Note: ${dmarcResult.message}`);
  console.log("");

  console.log("OVERALL STATUS:");
  console.log(overallOk ? "- WORKING" : "- BROKEN");
  console.log("");

  console.log("FIX REQUIRED:");
  if (missingRecords.length === 0) {
    console.log("- No fix required. DNS appears to match the expected GoDaddy email setup.");
  } else {
    missingRecords.forEach((message) => console.log(`- ${message}`));
  }
  console.log("");

  console.log("GENERATED VERCEL DNS FIX:");
  console.log(buildRecommendedZone(domain));
  console.log("");
  console.log("NOTE: This script only recommends DNS changes. Do not apply changes automatically.");
}

run().catch((error) => {
  console.error("Unexpected error while checking DNS:", error);
  process.exit(1);
});