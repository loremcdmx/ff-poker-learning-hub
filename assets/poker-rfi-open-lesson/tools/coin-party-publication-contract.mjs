import assert from "node:assert/strict";
import crypto from "node:crypto";

export const COIN_PARTY_PUBLICATION_NETWORKS = Object.freeze([
  "CoinPoker",
  "PartyPoker",
]);

export const COIN_PARTY_PUBLICATION_CONTRACT = Object.freeze({
  schema: "ff-rfi-coin-party-publication-contract-v2",
  cohort: "l3top",
  selectedPlayers: 244,
  userShardsPerNetwork: 4,
  tableSize: 7,
  stackBuckets: 9,
  positions: 6,
  handClasses: 169,
  possibleCells: 9126,
  targetFilter: false,
  frozenSnapshot: Object.freeze({
    window: Object.freeze(["2023-09-01", "2026-07-26"]),
    membershipSha256: "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
    userIdsSha256: "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771",
    strongGateTotals: Object.freeze({
      CoinPoker: Object.freeze({
        rawKeys: 651627,
        exactIdMatchKeys: 630348,
        nominalNovelKeys: 21279,
        normalizedTimeEligibleKeys: 19759,
        publicationEligibleKeys: 19759,
      }),
      PartyPoker: Object.freeze({
        rawKeys: 198324,
        exactIdMatchKeys: 190491,
        nominalNovelKeys: 7833,
        normalizedTimeEligibleKeys: 7828,
        publicationEligibleKeys: 7828,
      }),
    }),
  }),
  privateOverlapValidation: Object.freeze({
    binding: Object.freeze({
      reportSchema: "ff-rfi-coin-party-parser-validation-v2",
      parserTemplateSha256: "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
      parserImplementationSha256: "673a2d5967625a6874e5acade450269fc30677cb786418a85af593b77e407d3e",
      grammarSha256: "e570a7271fd8dbff3c90bb840335f28eda10f63094065c57b8c4c328170e8f06",
      membershipSha256: "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
      userIdsSha256: "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771",
      window: Object.freeze(["2023-09-01", "2026-07-26"]),
    }),
    source: Object.freeze({
      inputSha256: "2d1e2323a6d497b85b94d6278249dc3e9d78cce2c52477936021d5b9046592f6",
      inputBytes: 2859078,
      rows: 1366,
      uniqueUsers: 22,
      firstObservedAt: "2026-02-08T00:19:28Z",
      lastObservedAt: "2026-07-20T20:39:15Z",
    }),
    CoinPoker: Object.freeze({
      sample: 1191,
      accepted: 1191,
      cardMismatches: 0,
      positionMismatches: 0,
      effectiveStackMismatches: 0,
      publicStackMismatches: 0,
      actionMismatches: 0,
      shoveMismatches: 0,
    }),
    PartyPoker: Object.freeze({
      exact7Sample: 160,
      acceptedExact7: 160,
      raw8Sample: 15,
      rejectedRaw8: 15,
      cardMismatches: 0,
      positionMismatches: 0,
      effectiveStackMismatches: 0,
      publicStackMismatches: 0,
      actionMismatches: 0,
      shoveMismatches: 0,
    }),
  }),
  privacy: Object.freeze({
    aggregateOnly: true,
    rawHandHistoriesPublished: false,
    personalIdentifiersPublished: false,
  }),
  publicInputPrivacy: Object.freeze({
    aggregateOnly: true,
    noRawHandHistories: true,
    noPlayerLevelRows: true,
    noUserIds: true,
  }),
  execution: Object.freeze({
    mode: "async",
    receiptSchema: "ff-rfi-coin-party-publication-execution-v2",
    finishedAtOrAfterWindowEnd: true,
  }),
});

export const COIN_PARTY_HEADER_CONTRACT = Object.freeze({
  CoinPoker: Object.freeze({
    rawHeaderIdPattern: String.raw`(?im)^PokerStars Hand #([0-9]+):`,
    structuredHeaderIdExpression: "hh_id",
    rawHeaderMatchPredicate: "arrayElement(r.valid_header_ids, 1) = r.hh_id",
  }),
  PartyPoker: Object.freeze({
    rawHeaderIdPattern: String.raw`(?im)^\*{5}\s*Hand History For Game\s+([^\s*]+)\s*\*{5}`,
    structuredHeaderIdExpression: "if(length(hh_id) > 6, left(hh_id, length(hh_id) - 6), '')",
    rawHeaderMatchPredicate: "length(r.hh_id) > 6 AND arrayElement(r.valid_header_ids, 1) = left(r.hh_id, length(r.hh_id) - 6)",
  }),
});

export function coinPartyGrammarContract() {
  const contract = {
    supportedNetworks: COIN_PARTY_PUBLICATION_NETWORKS,
    textParserAlias: "PokerStars",
    normalizations: [
      "optional euro marker before seat stack",
      "optional euro marker before blind or ante amount",
      "parenthesized blind or ante amount",
      "PartyPoker triple-star PRE-FLOP boundary",
    ],
    header: COIN_PARTY_HEADER_CONTRACT,
  };
  return Object.freeze({
    ...contract,
    sha256: sha256(stableJson(contract)),
  });
}

export function validateCoinPartyGateTotals(network, totals) {
  assert(COIN_PARTY_PUBLICATION_NETWORKS.includes(network), `unsupported network ${network}`);
  const normalized = {
    rawKeys: nonNegativeInteger(totals.rawKeys, "rawKeys"),
    exactIdMatchKeys: nonNegativeInteger(totals.exactIdMatchKeys, "exactIdMatchKeys"),
    nominalNovelKeys: nonNegativeInteger(totals.nominalNovelKeys, "nominalNovelKeys"),
    normalizedTimeEligibleKeys: nonNegativeInteger(
      totals.normalizedTimeEligibleKeys,
      "normalizedTimeEligibleKeys",
    ),
    publicationEligibleKeys: nonNegativeInteger(
      totals.publicationEligibleKeys,
      "publicationEligibleKeys",
    ),
  };
  assert.equal(
    normalized.rawKeys,
    normalized.exactIdMatchKeys + normalized.nominalNovelKeys,
    `${network}: exact-id partition`,
  );
  assert(
    normalized.publicationEligibleKeys <= normalized.normalizedTimeEligibleKeys
      && normalized.normalizedTimeEligibleKeys <= normalized.nominalNovelKeys,
    `${network}: publication partition`,
  );
  return normalized;
}

export function validateFrozenCoinPartyGateTotals(network, totals) {
  const normalized = validateCoinPartyGateTotals(network, totals);
  assert.deepEqual(
    normalized,
    COIN_PARTY_PUBLICATION_CONTRACT.frozenSnapshot.strongGateTotals[network],
    `${network}: strong frozen gate totals drift`,
  );
  return normalized;
}

function nonNegativeInteger(value, label) {
  const result = Number(value);
  assert(Number.isSafeInteger(result) && result >= 0, `${label} must be a non-negative integer`);
  return result;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
