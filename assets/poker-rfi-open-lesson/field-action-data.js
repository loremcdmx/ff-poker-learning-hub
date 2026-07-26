(function(){
  "use strict";
  window.PokerRfiFieldActionData = {
  "schema": "ff-rfi-field-actions-v3",
  "version": "rfi-field-actions-exact7-12271ff60059",
  "handOrder": [
    "AA",
    "AKs",
    "AQs",
    "AJs",
    "ATs",
    "A9s",
    "A8s",
    "A7s",
    "A6s",
    "A5s",
    "A4s",
    "A3s",
    "A2s",
    "AKo",
    "KK",
    "KQs",
    "KJs",
    "KTs",
    "K9s",
    "K8s",
    "K7s",
    "K6s",
    "K5s",
    "K4s",
    "K3s",
    "K2s",
    "AQo",
    "KQo",
    "QQ",
    "QJs",
    "QTs",
    "Q9s",
    "Q8s",
    "Q7s",
    "Q6s",
    "Q5s",
    "Q4s",
    "Q3s",
    "Q2s",
    "AJo",
    "KJo",
    "QJo",
    "JJ",
    "JTs",
    "J9s",
    "J8s",
    "J7s",
    "J6s",
    "J5s",
    "J4s",
    "J3s",
    "J2s",
    "ATo",
    "KTo",
    "QTo",
    "JTo",
    "TT",
    "T9s",
    "T8s",
    "T7s",
    "T6s",
    "T5s",
    "T4s",
    "T3s",
    "T2s",
    "A9o",
    "K9o",
    "Q9o",
    "J9o",
    "T9o",
    "99",
    "98s",
    "97s",
    "96s",
    "95s",
    "94s",
    "93s",
    "92s",
    "A8o",
    "K8o",
    "Q8o",
    "J8o",
    "T8o",
    "98o",
    "88",
    "87s",
    "86s",
    "85s",
    "84s",
    "83s",
    "82s",
    "A7o",
    "K7o",
    "Q7o",
    "J7o",
    "T7o",
    "97o",
    "87o",
    "77",
    "76s",
    "75s",
    "74s",
    "73s",
    "72s",
    "A6o",
    "K6o",
    "Q6o",
    "J6o",
    "T6o",
    "96o",
    "86o",
    "76o",
    "66",
    "65s",
    "64s",
    "63s",
    "62s",
    "A5o",
    "K5o",
    "Q5o",
    "J5o",
    "T5o",
    "95o",
    "85o",
    "75o",
    "65o",
    "55",
    "54s",
    "53s",
    "52s",
    "A4o",
    "K4o",
    "Q4o",
    "J4o",
    "T4o",
    "94o",
    "84o",
    "74o",
    "64o",
    "54o",
    "44",
    "43s",
    "42s",
    "A3o",
    "K3o",
    "Q3o",
    "J3o",
    "T3o",
    "93o",
    "83o",
    "73o",
    "63o",
    "53o",
    "43o",
    "33",
    "32s",
    "A2o",
    "K2o",
    "Q2o",
    "J2o",
    "T2o",
    "92o",
    "82o",
    "72o",
    "62o",
    "52o",
    "42o",
    "32o",
    "22"
  ],
  "stackOrder": [
    "70+",
    "30-70",
    "20-30",
    "15-20",
    "<15"
  ],
  "positions": [
    "EP",
    "MP",
    "HJ",
    "CO",
    "BTN",
    "SB"
  ],
  "cohortOrder": [
    "l3top",
    "l3",
    "l2",
    "l1"
  ],
  "methodology": {
    "period": {
      "from": "2023-09-01",
      "through": "2026-07-25",
      "toExclusive": "2026-07-26",
      "label": "2023-09-01 — 2026-07-25"
    },
    "table": "7-max",
    "opportunity": "неоткрытый банк, известные карманные карты, эффективный стек 0–200 BB",
    "actionSplit": "пас / обычный рейз / эффективный open-push / лимп",
    "actionClassifier": {
      "shove": "preflop_action='R' AND (is_preflop_allin=1 OR raise_and_blind_made_amount_bb - posted_blind_bb >= effective_stack_bb - 0.01)",
      "regularRaise": "preflop_action starts with R except an exact direct effective shove; later RC/RR sequences remain regular opens",
      "sanity": "Every stack bucket reconciles shove into all-in-flag and effective-amount-only reasons; a non-all-in 2.5–3.5 BB raise with stack behind must never be shove."
    },
    "cohortRule": "текущая лига, активный реальный игрок, без кикнутых аккаунтов, минимум 30 000 рук FFEV",
    "exactCellMinimum": 50,
    "stateGate": "Публикация целиком требует 5 диапазонов стеков × 6 позиций × 4 группы; в каждом чарте 169/169 рук с N >= 50. Частичный каталог не создаётся.",
    "stackAggregation": {
      "70+": [
        "70+"
      ],
      "30-70": [
        "30-70"
      ],
      "20-30": [
        "20-30"
      ],
      "15-20": [
        "15-20"
      ],
      "<15": [
        "12-15",
        "10-12",
        "8-10",
        "6-8",
        "<6"
      ]
    },
    "frequencyPolicy": "Только частоты из наблюдаемых целочисленных счётчиков, округлённые до целого процента; без сглаживания, интерполяции или модельного заполнения.",
    "top25": {
      "eligiblePlayers": 975,
      "selectedPlayers": 244,
      "minHands": 30000,
      "minFFev": 9.670668657450951,
      "ranks": "текущая Лига 3",
      "metric": "ev_2_weighted",
      "periodType": "last_100k_hands",
      "selection": "верхние 25% по текущему FFEV; deterministic rank, ceil(N × 0.25)"
    },
    "sourceSnapshot": {
      "rows": 36504,
      "sha256": "12271ff6005957d0fe58fd24066195dfc90e04544228af207e4ce3296daeed3b",
      "membershipRows": 1868,
      "membershipSha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
      "membershipKeysSha256": "acc30ed1d0ee10cefee50145a3889ae5485a3f2f6b6d770073b5db141039c7a7",
      "membershipQuerySha256": "426e9931e2b806acbe234fb31b3b907e50c7e9678a49072c7682a109ae4b6ba8",
      "cohortJobId": "mcp_bq_job_19896ef7f69e4d6dba1de2eab8eccc11",
      "membershipExecutionMode": "async",
      "membershipReceipt": {
        "jobId": "mcp_bq_job_19896ef7f69e4d6dba1de2eab8eccc11",
        "rowCount": 1868,
        "byteSize": 77236,
        "finishedAt": "2026-07-26T16:48:34.586Z"
      },
      "actionJobIds": [
        "mcp_ch_job_56a7b449640d4c349de05aabb8c7266c",
        "mcp_ch_job_5666d8cdaa0b4948bf3590e17d8bf84d",
        "mcp_ch_job_c3e99be74bfe4a58899c127bf7788671",
        "mcp_ch_job_a33728d567894179adca67b5e8a5bcb3",
        "mcp_ch_job_ee654e01fec1471790d6e34b2caf1c15",
        "mcp_ch_job_8870a5aba6134e63a005e72771c0eb57",
        "mcp_ch_job_aaf3243f703a4f5f873083b62ee759cb",
        "mcp_ch_job_14238c749c9c4c1c915b801461fa2fbe",
        "mcp_ch_job_0b0d39e1b59a440fbbf89ed4b573b892",
        "mcp_ch_job_7fb8505f397445a9a54c095beb6aaba3"
      ],
      "actionShardStrategy": "exact-same-window-novel-raw-l3top-supplement-with-l3-delta",
      "actionShards": [
        {
          "sourceKind": "structured-field-action",
          "queryJobId": "mcp_ch_job_56a7b449640d4c349de05aabb8c7266c",
          "executionMode": "async",
          "startedAt": "2026-07-26T20:00:22.348627Z",
          "finishedAt": "2026-07-26T20:02:50.544245Z",
          "rendererMetadataSha256": "7542b63521e16f536ad04cf1b5eba13dfdd6b77a033c61739a8ecac8c4803e8f",
          "receiptSha256": "6c99ad2df8a88dacd41fa407073c9f2a7e51574165b907814df1300d80e67c01",
          "querySha256": "d8e4c58d41dd74d840da0722e528854eb9ed89d30b8ce3d25b6882850e0a6b37",
          "resultSha256": "604047df406fff4012190f9939a4740175c030a56ad2cf9871050e6a28d8e7c9",
          "resultRows": 36720,
          "resultBytes": 6844128,
          "templateSha256": "9e06fa18c5889fd12e00cab250af6dc17ad1d543f4ef67a4cbf65351c6093cde",
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "userShard": {
            "index": 0,
            "count": 1,
            "users": 1624,
            "userIdsSha256": "0479eaa1bea4e3115646e7ec88978037c79aee58a6c2e2d0c97b699d4d98edac"
          },
          "membershipSha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
          "membershipKeysSha256": "acc30ed1d0ee10cefee50145a3889ae5485a3f2f6b6d770073b5db141039c7a7",
          "privacy": {
            "aggregateOnly": true,
            "rawHandHistoriesPublished": false,
            "personalIdentifiersPublished": false
          },
          "handClassMode": "joined-holecards-str",
          "holecardMappingSha256": null
        },
        {
          "sourceKind": "missing-card-recovery-full-cube",
          "queryJobId": "mcp_ch_job_5666d8cdaa0b4948bf3590e17d8bf84d",
          "executionMode": "async",
          "startedAt": "2026-07-26T20:02:50.642046Z",
          "finishedAt": "2026-07-26T20:03:28.641997Z",
          "rendererMetadataSha256": "a529fa3df8737ebcd889303b6e258cf395edb058d6047f328f3bcfed538f6f2a",
          "receiptSha256": "1d3417c8eeac75353b0246c359a6bfd37d69aa1cd4b4f60627b52aae8f199985",
          "querySha256": "2ee0806f3b04a81e68e96bd7b922a0605b48d95894e0d2f68f2b678b805753b7",
          "resultSha256": "e63cc8c1bc788c7203a0eb5640effbd0b8a8b539f2c90e09f2e8412d793466cb",
          "resultRows": 9126,
          "resultBytes": 1687441,
          "templateSha256": "56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533",
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "userShard": {
            "index": 0,
            "count": 1,
            "users": 244,
            "userIdsSha256": "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771"
          },
          "membershipSha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
          "membershipKeysSha256": "acc30ed1d0ee10cefee50145a3889ae5485a3f2f6b6d770073b5db141039c7a7",
          "privacy": {
            "aggregateOnly": true,
            "rawHandHistoriesPublished": false,
            "personalIdentifiersPublished": false
          },
          "parserGrammarsSha256": "07a1f3093dc6461c4cbc44163394ee3c86cc555df4504a9f2d7ada9ef3af3960",
          "parserNetworks": [
            "888Poker",
            "Chico",
            "GGNetwork",
            "PokerPlanets",
            "PokerStars",
            "PokerStars(FR-ES-PT)",
            "Winamax.fr",
            "WPN",
            "iPoker"
          ],
          "recoveryIsDisjoint": true,
          "recoveryPredicate": "latest structured_hand_class = ''",
          "rawJoin": {
            "type": "exact-key",
            "trackerKey": [
              "toUInt64(user_id)",
              "toString(network)",
              "toString(hh_id)"
            ],
            "rawKey": [
              "toUInt64(check_user_id)",
              "toString(network)",
              "toString(converted_hh_id)"
            ]
          },
          "validation": {
            "schema": "ff-rfi-missing-card-recovery-validation-v1",
            "manifestSha256": "e664bade4915b6622d13effc2a6bcc5d56b8a6b9ca27af7ae5de4038f6c4b574",
            "queryJobId": "sync:7ac740984bcbdcb2b871ae6eb561480070a7d453875346145cfe74b77795616e",
            "queryExecutionMode": "sync",
            "startedAt": "2026-07-26T21:58:57.206Z",
            "finishedAt": "2026-07-26T21:59:10.617Z",
            "rendererMetadataSha256": "7d24bc730c32ec71a7fd43f1489e54d5c982f713ebe00140dcb01b2b1d2fbef7",
            "renderedSqlSha256": "7ac740984bcbdcb2b871ae6eb561480070a7d453875346145cfe74b77795616e",
            "queryTemplateSha256": "56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533",
            "resultSha256": "fcba3cf0f41ebc0f1d7c7823e0ec898752405d264494275d24a36b4f0e01445b",
            "resultRows": 9,
            "resultBytes": 562,
            "receiptSha256": "86361b0d8952848d064d9ce5343144a5242f59c94322d68d2577a589c23293e1",
            "window": {
              "startInclusive": "2026-07-01T00:00:00Z",
              "endExclusive": "2026-07-02T00:00:00Z",
              "semantics": "half-open-utc"
            },
            "networks": {
              "888Poker": {
                "classFailures": 0,
                "classMatches": 116,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 118,
                "rawHhJoined": 118,
                "trackerKnownWithRaw": 116,
                "trackerMissingRecovered": 2,
                "trackerRows": 129,
                "validationPassed": 1
              },
              "Chico": {
                "classFailures": 0,
                "classMatches": 374,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 427,
                "rawHhJoined": 427,
                "trackerKnownWithRaw": 374,
                "trackerMissingRecovered": 53,
                "trackerRows": 451,
                "validationPassed": 1
              },
              "GGNetwork": {
                "classFailures": 0,
                "classMatches": 4364,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 4364,
                "rawHhJoined": 4364,
                "trackerKnownWithRaw": 4364,
                "trackerMissingRecovered": 0,
                "trackerRows": 4364,
                "validationPassed": 1
              },
              "PokerPlanets": {
                "classFailures": 0,
                "classMatches": 70,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 70,
                "rawHhJoined": 70,
                "trackerKnownWithRaw": 70,
                "trackerMissingRecovered": 0,
                "trackerRows": 70,
                "validationPassed": 1
              },
              "PokerStars": {
                "classFailures": 0,
                "classMatches": 356,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 364,
                "rawHhJoined": 364,
                "trackerKnownWithRaw": 356,
                "trackerMissingRecovered": 8,
                "trackerRows": 374,
                "validationPassed": 1
              },
              "PokerStars(FR-ES-PT)": {
                "classFailures": 0,
                "classMatches": 207,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 245,
                "rawHhJoined": 245,
                "trackerKnownWithRaw": 207,
                "trackerMissingRecovered": 38,
                "trackerRows": 274,
                "validationPassed": 1
              },
              "Winamax.fr": {
                "classFailures": 0,
                "classMatches": 417,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 488,
                "rawHhJoined": 488,
                "trackerKnownWithRaw": 417,
                "trackerMissingRecovered": 71,
                "trackerRows": 521,
                "validationPassed": 1
              },
              "WPN": {
                "classFailures": 0,
                "classMatches": 223,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 233,
                "rawHhJoined": 233,
                "trackerKnownWithRaw": 223,
                "trackerMissingRecovered": 10,
                "trackerRows": 293,
                "validationPassed": 1
              },
              "iPoker": {
                "classFailures": 0,
                "classMatches": 2262,
                "matchPctTrackerKnown": 100,
                "parserSuccess": 3594,
                "rawHhJoined": 3594,
                "trackerKnownWithRaw": 2262,
                "trackerMissingRecovered": 1332,
                "trackerRows": 3986,
                "validationPassed": 1
              }
            },
            "totals": {
              "classFailures": 0,
              "classMatches": 8389,
              "parserSuccess": 9903,
              "rawHhJoined": 9903,
              "trackerKnownWithRaw": 8389,
              "trackerMissingRecovered": 1514,
              "trackerRows": 10462
            },
            "privacy": {
              "aggregateOnly": true,
              "rawHandHistoriesPublished": false,
              "personalIdentifiersPublished": false
            }
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "CoinPoker",
          "userShard": {
            "index": 0,
            "count": 4,
            "users": 61,
            "userIdsSha256": "cfc8e4970f47a35ff8cd2b86d898e56f250707e67b88a494335cec017ac33ead"
          },
          "queryJobId": "mcp_ch_job_c3e99be74bfe4a58899c127bf7788671",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:16:18.175Z",
          "finishedAt": "2026-07-26T21:17:51.153Z",
          "rendererMetadataSha256": "21ac7216cc3ebfbb24e8ed45c9afd742afb20668e2174cf79c3827306226b775",
          "receiptSha256": "d2fc5f2ec53dbbd39292bb645a9925d7ba98a1c77822a02f4b796202e12c51ae",
          "querySha256": "fda32aa2720daee22f931f32a200950bb6fa10f4d5fd0466c4e12fb57766db6f",
          "resultSha256": "cc24f9493667cb49ac4d895e9e9bc9f8c408ae93a894717b1cc09e0e392d244f",
          "resultRows": 2029,
          "resultBytes": 431332,
          "observedStates": 54,
          "observedCells": 2029,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 239712,
            "exact_id_match_keys": 224158,
            "nominal_novel_keys": 15554,
            "normalized_time_eligible_keys": 15472,
            "publication_eligible_keys": 15472
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "CoinPoker",
          "userShard": {
            "index": 1,
            "count": 4,
            "users": 61,
            "userIdsSha256": "f5ea01467f0dfcc1cad762b73a146e87604d5d85307a5146f54767de9cc6eae6"
          },
          "queryJobId": "mcp_ch_job_a33728d567894179adca67b5e8a5bcb3",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:17:51.262Z",
          "finishedAt": "2026-07-26T21:19:11.867Z",
          "rendererMetadataSha256": "37725f129abefdd0a10d60e51d609fda9fd10b2fcb0f506e46b4cddb2d541c73",
          "receiptSha256": "7d516d6ccd31947664c016264ed4f0aabf24d1ee7f9a5e6564e84d22d8d6187e",
          "querySha256": "928a7f1bbed6e872566010fb3df0012f8f51cf4746d7ae9b02cf7a2d7a98781b",
          "resultSha256": "232dee21707394caa73082f474aa31281e69a7adae006eb29b1a3afdd09089d6",
          "resultRows": 395,
          "resultBytes": 82760,
          "observedStates": 46,
          "observedCells": 395,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 256962,
            "exact_id_match_keys": 252714,
            "nominal_novel_keys": 4248,
            "normalized_time_eligible_keys": 4241,
            "publication_eligible_keys": 4241
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "CoinPoker",
          "userShard": {
            "index": 2,
            "count": 4,
            "users": 61,
            "userIdsSha256": "eaa2cc78f8ff1451f5f0bf4d9d919a06a79743206074a92d2990dce4b9260744"
          },
          "queryJobId": "mcp_ch_job_ee654e01fec1471790d6e34b2caf1c15",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:25:42.446Z",
          "finishedAt": "2026-07-26T21:26:55.242Z",
          "rendererMetadataSha256": "c355bf1f1f9cf0e16a2cb6001401752e4b40dd87bddcaea5c222056f88ec1166",
          "receiptSha256": "4294a9c8e0e347a7536372e81dcf13389b34dae0e922e0e5e0106c913713a2dd",
          "querySha256": "c97a93a12cc1426ece941d0580ab946545563a6938adf3c2718e40aa86cb8d43",
          "resultSha256": "251f9d1a43774516e47425f607682e02458f6875066c69dcaaaff470f02a1f27",
          "resultRows": 10,
          "resultBytes": 2786,
          "observedStates": 10,
          "observedCells": 10,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 153521,
            "exact_id_match_keys": 153476,
            "nominal_novel_keys": 45,
            "normalized_time_eligible_keys": 45,
            "publication_eligible_keys": 45
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "CoinPoker",
          "userShard": {
            "index": 3,
            "count": 4,
            "users": 61,
            "userIdsSha256": "43e19fa97726b70547d00016a202f01003daf5add9b73e1c76fb042c60353b37"
          },
          "queryJobId": "mcp_ch_job_8870a5aba6134e63a005e72771c0eb57",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:21:32.141994Z",
          "finishedAt": "2026-07-26T21:22:42.542018Z",
          "rendererMetadataSha256": "2a4bfdf4ef756bc77d650c2a5499d0f79a80459e4632856b9e222998cb6c1d6d",
          "receiptSha256": "addab024da21c366374a24f8debe6de8d2d9d7a062b1ece9fdc2d438c2e1e6de",
          "querySha256": "dfc0efb0aaf9b9af2150ee157f294a701a0fcc0c8d980cce60c11dad1e2b401e",
          "resultSha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
          "resultRows": 0,
          "resultBytes": 1,
          "observedStates": 0,
          "observedCells": 0,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 1432,
            "exact_id_match_keys": 0,
            "nominal_novel_keys": 1432,
            "normalized_time_eligible_keys": 1,
            "publication_eligible_keys": 1
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "PartyPoker",
          "userShard": {
            "index": 0,
            "count": 4,
            "users": 61,
            "userIdsSha256": "cfc8e4970f47a35ff8cd2b86d898e56f250707e67b88a494335cec017ac33ead"
          },
          "queryJobId": "mcp_ch_job_aaf3243f703a4f5f873083b62ee759cb",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:22:42.542018Z",
          "finishedAt": "2026-07-26T21:24:40.044409Z",
          "rendererMetadataSha256": "50bd930d88e8cc910a222ad0452e9a49296c894417b0dfadf6bc7fa2586ed160",
          "receiptSha256": "60cc57f1ea564b41fc40b368649e9d082f1b97304c6d7f8e56be1c3291d647fd",
          "querySha256": "1316f2b36ccbe8fc913047b8ee84380701240bbbc7fc41f2567007c892479e50",
          "resultSha256": "84824a78f03339f42bab33e75d680d19b87eb3422e63a0b7b7ba2f344d9aa9ad",
          "resultRows": 340,
          "resultBytes": 71026,
          "observedStates": 42,
          "observedCells": 340,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 84747,
            "exact_id_match_keys": 82837,
            "nominal_novel_keys": 1910,
            "normalized_time_eligible_keys": 1910,
            "publication_eligible_keys": 1910
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "PartyPoker",
          "userShard": {
            "index": 1,
            "count": 4,
            "users": 61,
            "userIdsSha256": "f5ea01467f0dfcc1cad762b73a146e87604d5d85307a5146f54767de9cc6eae6"
          },
          "queryJobId": "mcp_ch_job_14238c749c9c4c1c915b801461fa2fbe",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:55:38.441425Z",
          "finishedAt": "2026-07-26T21:56:52.678738Z",
          "rendererMetadataSha256": "408f4e69498d72bd55325de0acd37229c8363819533f733a1e92c6d580262ffb",
          "receiptSha256": "9f8ad78e071acd59b17c9a64b76607115561450bbcc5bb2bdee2fdad44f8e28e",
          "querySha256": "da6cf155f75cc3efa4f5dfe50344cb5dcd2b01038cc5bdf64b28009cebfde225",
          "resultSha256": "977986c3bf0403ae17f47fd569bfbd334f1a9d7ff10c6c47467022ccd67fcb49",
          "resultRows": 747,
          "resultBytes": 157079,
          "observedStates": 47,
          "observedCells": 747,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 109986,
            "exact_id_match_keys": 104063,
            "nominal_novel_keys": 5923,
            "normalized_time_eligible_keys": 5918,
            "publication_eligible_keys": 5918
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "PartyPoker",
          "userShard": {
            "index": 2,
            "count": 4,
            "users": 61,
            "userIdsSha256": "eaa2cc78f8ff1451f5f0bf4d9d919a06a79743206074a92d2990dce4b9260744"
          },
          "queryJobId": "mcp_ch_job_0b0d39e1b59a440fbbf89ed4b573b892",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:24:40.044409Z",
          "finishedAt": "2026-07-26T21:25:42.446343Z",
          "rendererMetadataSha256": "bbb65df14fdf70e0e34c923da7e84ba6f0b2d3b1272fbb6d908a1c171fea2450",
          "receiptSha256": "136d13c557aacde9606eb0abdfef628f74a2f9b06a151e7a054ba5b948194e68",
          "querySha256": "d3db51d3256fa942dac42728e72c464e158639d632a3318b85a05d3a6390e440",
          "resultSha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
          "resultRows": 0,
          "resultBytes": 1,
          "observedStates": 0,
          "observedCells": 0,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 0,
            "exact_id_match_keys": 0,
            "nominal_novel_keys": 0,
            "normalized_time_eligible_keys": 0,
            "publication_eligible_keys": 0
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        },
        {
          "sourceKind": "coin-party-publication-v2",
          "network": "PartyPoker",
          "userShard": {
            "index": 3,
            "count": 4,
            "users": 61,
            "userIdsSha256": "43e19fa97726b70547d00016a202f01003daf5add9b73e1c76fb042c60353b37"
          },
          "queryJobId": "mcp_ch_job_7fb8505f397445a9a54c095beb6aaba3",
          "executionMode": "async",
          "startedAt": "2026-07-26T21:19:11.867143Z",
          "finishedAt": "2026-07-26T21:20:18.359604Z",
          "rendererMetadataSha256": "4cc28d647b6e8f982c8ae581fdbc62091b2681729910d63386f2d6db7f6e4743",
          "receiptSha256": "36b1a00667a6ab5e76a809a78ae78dd0d31a3c6e1ee49dbf7b1a27b82ab08c04",
          "querySha256": "1f533b5d928b6479ef30eb9a921daeda897a0304016a71393d072cebf8e29d78",
          "resultSha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
          "resultRows": 0,
          "resultBytes": 1,
          "observedStates": 0,
          "observedCells": 0,
          "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
          "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
          "publicationGate": {
            "raw_keys": 3591,
            "exact_id_match_keys": 3591,
            "nominal_novel_keys": 0,
            "normalized_time_eligible_keys": 0,
            "publication_eligible_keys": 0
          },
          "windowStartInclusive": "2023-09-01T00:00:00Z",
          "windowEndExclusive": "2026-07-26T00:00:00Z",
          "privacy": {
            "aggregateOnly": true,
            "noRawHandHistories": true,
            "noPlayerLevelRows": true,
            "noUserIds": true
          }
        }
      ],
      "mergeSchema": "ff-rfi-field-action-current-supplement-v1",
      "replacement": {
        "strategy": "exact-same-window-l3top-replacement-with-l3-delta",
        "replacedCohort": "l3top",
        "deltaAppliedCohort": "l3",
        "membershipSubsetProof": {
          "l3topMembers": 244,
          "l3Members": 975,
          "l3topIsSubsetOfL3": true
        },
        "l3top": {
          "structuredRows": 9126,
          "structuredProjectionSha256": "9740aa1afd3ffb8cf36bde4d42bde9bb7b7e9cbb5919ae214f163464b86694b2",
          "recoveryRows": 9126,
          "recoveryProjectionSha256": "d61c8ed20a1919ae93d7f47a9f351eb054881aba44ad32e5c496e71249fed9c1",
          "finalProjectionSha256": "d61c8ed20a1919ae93d7f47a9f351eb054881aba44ad32e5c496e71249fed9c1",
          "recoveryDominatesExactly": true
        },
        "l3Delta": {
          "exactCells": 9126,
          "stateCount": 54,
          "counters": {
            "opportunities": 911152,
            "raises_total": 239165,
            "regular_raise": 232966,
            "open_shove": 6199,
            "limp": 8770,
            "fold_other": 663217,
            "shove_allin_flag": 6028,
            "shove_effective_amount_only": 171,
            "regular_three_bb_open": 20626,
            "normal_three_bb_as_shove": 0,
            "non_exact_r_effective_allin": 1044
          },
          "knownCardDelta": 911152,
          "nonnegativePerCell": true,
          "appliedExactly": true,
          "eligibleCoverageChanged": false
        },
        "preserved": {
          "l2": {
            "rows": 9126,
            "sourceProjectionSha256": "771585e91118dbaf8fb7ba4286a30b11431335a1325979dd95c27653dad131d6",
            "finalProjectionSha256": "771585e91118dbaf8fb7ba4286a30b11431335a1325979dd95c27653dad131d6",
            "counters": {
              "opportunities": 24591799,
              "raises_total": 7321984,
              "regular_raise": 6743509,
              "open_shove": 578475,
              "limp": 401089,
              "fold_other": 16868726,
              "shove_allin_flag": 560178,
              "shove_effective_amount_only": 18297,
              "regular_three_bb_open": 632121,
              "normal_three_bb_as_shove": 0,
              "non_exact_r_effective_allin": 227177
            },
            "exact": true
          },
          "l1": {
            "rows": 9126,
            "sourceProjectionSha256": "2542ef7a614eb5a201a1ef7b0d8d87b5fae3c3749bb77bc7028ef8a9bcabc50d",
            "finalProjectionSha256": "2542ef7a614eb5a201a1ef7b0d8d87b5fae3c3749bb77bc7028ef8a9bcabc50d",
            "counters": {
              "opportunities": 11998366,
              "raises_total": 3527260,
              "regular_raise": 3267365,
              "open_shove": 259895,
              "limp": 226697,
              "fold_other": 8244409,
              "shove_allin_flag": 251351,
              "shove_effective_amount_only": 8544,
              "regular_three_bb_open": 285409,
              "normal_three_bb_as_shove": 0,
              "non_exact_r_effective_allin": 120070
            },
            "exact": true
          }
        }
      },
      "composition": null,
      "currentSupplement": {
        "schema": "ff-rfi-field-action-current-supplement-v1",
        "strategy": "exact-same-window-novel-raw-l3top-supplement-with-l3-delta",
        "supplementedCohort": "l3top",
        "deltaAppliedCohort": "l3",
        "window": {
          "startInclusive": "2023-09-01T00:00:00Z",
          "endExclusive": "2026-07-26T00:00:00Z",
          "semantics": "half-open-utc"
        },
        "membership": {
          "sha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
          "keysSha256": "acc30ed1d0ee10cefee50145a3889ae5485a3f2f6b6d770073b5db141039c7a7",
          "rows": 1868,
          "cohortCounts": {
            "l3top": 244,
            "l3": 975,
            "l2": 484,
            "l1": 165
          },
          "subsetProof": {
            "l3topMembers": 244,
            "l3Members": 975,
            "l3topIsSubsetOfL3": true
          }
        },
        "baseCurrent": {
          "schema": "ff-rfi-field-action-cohort-replacement-v1",
          "strategy": "exact-same-window-l3top-replacement-with-l3-delta",
          "manifestSha256": "30188c41934024a00c03d2b34580411caac58e45f8314fef5cb6ae1ccd708831",
          "aggregate": {
            "sha256": "d7864aeb342178c3532609484cd0fd81083a2e092aab46af957d68b230dbbd6e",
            "bytes": 6722875,
            "rows": 36504
          },
          "sourceMerges": {
            "structured": {
              "schema": "ff-rfi-field-action-merge-v1",
              "manifestSha256": "076e765dd858eb255fb6bc00669d5e780dd510accc51b411d020b4fb4872a335",
              "shardStrategy": "immutable-user-id",
              "aggregate": {
                "sha256": "2efd04f2c987dbb48743e064446d3cd8cff70c8b13c08026259ac2db1ec75659",
                "bytes": 6718518,
                "rows": 36504
              },
              "inputs": [
                {
                  "sourceKind": "structured-field-action",
                  "queryJobId": "mcp_ch_job_56a7b449640d4c349de05aabb8c7266c",
                  "executionMode": "async",
                  "startedAt": "2026-07-26T20:00:22.348627Z",
                  "finishedAt": "2026-07-26T20:02:50.544245Z",
                  "rendererMetadataSha256": "7542b63521e16f536ad04cf1b5eba13dfdd6b77a033c61739a8ecac8c4803e8f",
                  "receiptSha256": "6c99ad2df8a88dacd41fa407073c9f2a7e51574165b907814df1300d80e67c01",
                  "querySha256": "d8e4c58d41dd74d840da0722e528854eb9ed89d30b8ce3d25b6882850e0a6b37",
                  "resultSha256": "604047df406fff4012190f9939a4740175c030a56ad2cf9871050e6a28d8e7c9",
                  "resultRows": 36720,
                  "resultBytes": 6844128,
                  "templateSha256": "9e06fa18c5889fd12e00cab250af6dc17ad1d543f4ef67a4cbf65351c6093cde",
                  "windowStartInclusive": "2023-09-01T00:00:00Z",
                  "windowEndExclusive": "2026-07-26T00:00:00Z",
                  "userShard": {
                    "index": 0,
                    "count": 1,
                    "users": 1624,
                    "userIdsSha256": "0479eaa1bea4e3115646e7ec88978037c79aee58a6c2e2d0c97b699d4d98edac"
                  },
                  "membershipSha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
                  "membershipKeysSha256": "acc30ed1d0ee10cefee50145a3889ae5485a3f2f6b6d770073b5db141039c7a7",
                  "privacy": {
                    "aggregateOnly": true,
                    "rawHandHistoriesPublished": false,
                    "personalIdentifiersPublished": false
                  },
                  "handClassMode": "joined-holecards-str",
                  "holecardMappingSha256": null
                }
              ],
              "merged": {
                "rows": 36504,
                "sha256": "2efd04f2c987dbb48743e064446d3cd8cff70c8b13c08026259ac2db1ec75659",
                "windowStartInclusive": "2023-09-01T00:00:00Z",
                "windowEndExclusive": "2026-07-26T00:00:00Z",
                "knownCards": {
                  "eligible": 74712556,
                  "known": 63501490,
                  "lookupMismatch": 725832,
                  "pct": 84.994402
                },
                "totals": {
                  "opportunities": 63501490,
                  "raises_total": 18813259,
                  "regular_raise": 17317019,
                  "open_shove": 1496240,
                  "limp": 1013352,
                  "fold_other": 43674879,
                  "shove_allin_flag": 1456054,
                  "shove_effective_amount_only": 40186,
                  "regular_three_bb_open": 1574574,
                  "normal_three_bb_as_shove": 0,
                  "non_exact_r_effective_allin": 566918
                }
              }
            },
            "recovery": {
              "schema": "ff-rfi-field-action-merge-v1",
              "manifestSha256": "bdb919b3e58f415aceb1963d45c8ed3b84c62d09627e7218320f16e7f85ee0fe",
              "shardStrategy": "immutable-user-id",
              "sourceKind": "missing-card-recovery-full-cube",
              "aggregate": {
                "sha256": "ea4ee166b2a399e4408e0c8abd9c638089cd19b5428cdc626d73f63980759de2",
                "bytes": 1658835,
                "rows": 9126
              },
              "inputs": [
                {
                  "sourceKind": "missing-card-recovery-full-cube",
                  "queryJobId": "mcp_ch_job_5666d8cdaa0b4948bf3590e17d8bf84d",
                  "executionMode": "async",
                  "startedAt": "2026-07-26T20:02:50.642046Z",
                  "finishedAt": "2026-07-26T20:03:28.641997Z",
                  "rendererMetadataSha256": "a529fa3df8737ebcd889303b6e258cf395edb058d6047f328f3bcfed538f6f2a",
                  "receiptSha256": "1d3417c8eeac75353b0246c359a6bfd37d69aa1cd4b4f60627b52aae8f199985",
                  "querySha256": "2ee0806f3b04a81e68e96bd7b922a0605b48d95894e0d2f68f2b678b805753b7",
                  "resultSha256": "e63cc8c1bc788c7203a0eb5640effbd0b8a8b539f2c90e09f2e8412d793466cb",
                  "resultRows": 9126,
                  "resultBytes": 1687441,
                  "templateSha256": "56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533",
                  "windowStartInclusive": "2023-09-01T00:00:00Z",
                  "windowEndExclusive": "2026-07-26T00:00:00Z",
                  "userShard": {
                    "index": 0,
                    "count": 1,
                    "users": 244,
                    "userIdsSha256": "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771"
                  },
                  "membershipSha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
                  "membershipKeysSha256": "acc30ed1d0ee10cefee50145a3889ae5485a3f2f6b6d770073b5db141039c7a7",
                  "privacy": {
                    "aggregateOnly": true,
                    "rawHandHistoriesPublished": false,
                    "personalIdentifiersPublished": false
                  },
                  "parserGrammarsSha256": "07a1f3093dc6461c4cbc44163394ee3c86cc555df4504a9f2d7ada9ef3af3960",
                  "parserNetworks": [
                    "888Poker",
                    "Chico",
                    "GGNetwork",
                    "PokerPlanets",
                    "PokerStars",
                    "PokerStars(FR-ES-PT)",
                    "Winamax.fr",
                    "WPN",
                    "iPoker"
                  ],
                  "recoveryIsDisjoint": true,
                  "recoveryPredicate": "latest structured_hand_class = ''",
                  "rawJoin": {
                    "type": "exact-key",
                    "trackerKey": [
                      "toUInt64(user_id)",
                      "toString(network)",
                      "toString(hh_id)"
                    ],
                    "rawKey": [
                      "toUInt64(check_user_id)",
                      "toString(network)",
                      "toString(converted_hh_id)"
                    ]
                  },
                  "validation": {
                    "schema": "ff-rfi-missing-card-recovery-validation-v1",
                    "manifestSha256": "e664bade4915b6622d13effc2a6bcc5d56b8a6b9ca27af7ae5de4038f6c4b574",
                    "queryJobId": "sync:7ac740984bcbdcb2b871ae6eb561480070a7d453875346145cfe74b77795616e",
                    "queryExecutionMode": "sync",
                    "startedAt": "2026-07-26T21:58:57.206Z",
                    "finishedAt": "2026-07-26T21:59:10.617Z",
                    "rendererMetadataSha256": "7d24bc730c32ec71a7fd43f1489e54d5c982f713ebe00140dcb01b2b1d2fbef7",
                    "renderedSqlSha256": "7ac740984bcbdcb2b871ae6eb561480070a7d453875346145cfe74b77795616e",
                    "queryTemplateSha256": "56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533",
                    "resultSha256": "fcba3cf0f41ebc0f1d7c7823e0ec898752405d264494275d24a36b4f0e01445b",
                    "resultRows": 9,
                    "resultBytes": 562,
                    "receiptSha256": "86361b0d8952848d064d9ce5343144a5242f59c94322d68d2577a589c23293e1",
                    "window": {
                      "startInclusive": "2026-07-01T00:00:00Z",
                      "endExclusive": "2026-07-02T00:00:00Z",
                      "semantics": "half-open-utc"
                    },
                    "networks": {
                      "888Poker": {
                        "classFailures": 0,
                        "classMatches": 116,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 118,
                        "rawHhJoined": 118,
                        "trackerKnownWithRaw": 116,
                        "trackerMissingRecovered": 2,
                        "trackerRows": 129,
                        "validationPassed": 1
                      },
                      "Chico": {
                        "classFailures": 0,
                        "classMatches": 374,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 427,
                        "rawHhJoined": 427,
                        "trackerKnownWithRaw": 374,
                        "trackerMissingRecovered": 53,
                        "trackerRows": 451,
                        "validationPassed": 1
                      },
                      "GGNetwork": {
                        "classFailures": 0,
                        "classMatches": 4364,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 4364,
                        "rawHhJoined": 4364,
                        "trackerKnownWithRaw": 4364,
                        "trackerMissingRecovered": 0,
                        "trackerRows": 4364,
                        "validationPassed": 1
                      },
                      "PokerPlanets": {
                        "classFailures": 0,
                        "classMatches": 70,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 70,
                        "rawHhJoined": 70,
                        "trackerKnownWithRaw": 70,
                        "trackerMissingRecovered": 0,
                        "trackerRows": 70,
                        "validationPassed": 1
                      },
                      "PokerStars": {
                        "classFailures": 0,
                        "classMatches": 356,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 364,
                        "rawHhJoined": 364,
                        "trackerKnownWithRaw": 356,
                        "trackerMissingRecovered": 8,
                        "trackerRows": 374,
                        "validationPassed": 1
                      },
                      "PokerStars(FR-ES-PT)": {
                        "classFailures": 0,
                        "classMatches": 207,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 245,
                        "rawHhJoined": 245,
                        "trackerKnownWithRaw": 207,
                        "trackerMissingRecovered": 38,
                        "trackerRows": 274,
                        "validationPassed": 1
                      },
                      "Winamax.fr": {
                        "classFailures": 0,
                        "classMatches": 417,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 488,
                        "rawHhJoined": 488,
                        "trackerKnownWithRaw": 417,
                        "trackerMissingRecovered": 71,
                        "trackerRows": 521,
                        "validationPassed": 1
                      },
                      "WPN": {
                        "classFailures": 0,
                        "classMatches": 223,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 233,
                        "rawHhJoined": 233,
                        "trackerKnownWithRaw": 223,
                        "trackerMissingRecovered": 10,
                        "trackerRows": 293,
                        "validationPassed": 1
                      },
                      "iPoker": {
                        "classFailures": 0,
                        "classMatches": 2262,
                        "matchPctTrackerKnown": 100,
                        "parserSuccess": 3594,
                        "rawHhJoined": 3594,
                        "trackerKnownWithRaw": 2262,
                        "trackerMissingRecovered": 1332,
                        "trackerRows": 3986,
                        "validationPassed": 1
                      }
                    },
                    "totals": {
                      "classFailures": 0,
                      "classMatches": 8389,
                      "parserSuccess": 9903,
                      "rawHhJoined": 9903,
                      "trackerKnownWithRaw": 8389,
                      "trackerMissingRecovered": 1514,
                      "trackerRows": 10462
                    },
                    "privacy": {
                      "aggregateOnly": true,
                      "rawHandHistoriesPublished": false,
                      "personalIdentifiersPublished": false
                    }
                  }
                }
              ],
              "merged": {
                "rows": 9126,
                "sha256": "ea4ee166b2a399e4408e0c8abd9c638089cd19b5428cdc626d73f63980759de2",
                "windowStartInclusive": "2023-09-01T00:00:00Z",
                "windowEndExclusive": "2026-07-26T00:00:00Z",
                "knownCards": {
                  "eligible": 5922804,
                  "known": 5645314,
                  "lookupMismatch": 56208,
                  "pct": 95.314888
                },
                "totals": {
                  "opportunities": 5645314,
                  "raises_total": 1656460,
                  "regular_raise": 1532503,
                  "open_shove": 123957,
                  "limp": 75840,
                  "fold_other": 3913014,
                  "shove_allin_flag": 121314,
                  "shove_effective_amount_only": 2643,
                  "regular_three_bb_open": 136780,
                  "normal_three_bb_as_shove": 0,
                  "non_exact_r_effective_allin": 40086
                },
                "cube": {
                  "stateCount": 54,
                  "rowCount": 9126,
                  "handClassesPerState": 169,
                  "coverageReconciled": true
                }
              }
            }
          },
          "replacement": {
            "strategy": "exact-same-window-l3top-replacement-with-l3-delta",
            "replacedCohort": "l3top",
            "deltaAppliedCohort": "l3",
            "membershipSubsetProof": {
              "l3topMembers": 244,
              "l3Members": 975,
              "l3topIsSubsetOfL3": true
            },
            "l3top": {
              "structuredRows": 9126,
              "structuredProjectionSha256": "9740aa1afd3ffb8cf36bde4d42bde9bb7b7e9cbb5919ae214f163464b86694b2",
              "recoveryRows": 9126,
              "recoveryProjectionSha256": "d61c8ed20a1919ae93d7f47a9f351eb054881aba44ad32e5c496e71249fed9c1",
              "finalProjectionSha256": "d61c8ed20a1919ae93d7f47a9f351eb054881aba44ad32e5c496e71249fed9c1",
              "recoveryDominatesExactly": true
            },
            "l3Delta": {
              "exactCells": 9126,
              "stateCount": 54,
              "counters": {
                "opportunities": 911152,
                "raises_total": 239165,
                "regular_raise": 232966,
                "open_shove": 6199,
                "limp": 8770,
                "fold_other": 663217,
                "shove_allin_flag": 6028,
                "shove_effective_amount_only": 171,
                "regular_three_bb_open": 20626,
                "normal_three_bb_as_shove": 0,
                "non_exact_r_effective_allin": 1044
              },
              "knownCardDelta": 911152,
              "nonnegativePerCell": true,
              "appliedExactly": true,
              "eligibleCoverageChanged": false
            },
            "preserved": {
              "l2": {
                "rows": 9126,
                "sourceProjectionSha256": "771585e91118dbaf8fb7ba4286a30b11431335a1325979dd95c27653dad131d6",
                "finalProjectionSha256": "771585e91118dbaf8fb7ba4286a30b11431335a1325979dd95c27653dad131d6",
                "counters": {
                  "opportunities": 24591799,
                  "raises_total": 7321984,
                  "regular_raise": 6743509,
                  "open_shove": 578475,
                  "limp": 401089,
                  "fold_other": 16868726,
                  "shove_allin_flag": 560178,
                  "shove_effective_amount_only": 18297,
                  "regular_three_bb_open": 632121,
                  "normal_three_bb_as_shove": 0,
                  "non_exact_r_effective_allin": 227177
                },
                "exact": true
              },
              "l1": {
                "rows": 9126,
                "sourceProjectionSha256": "2542ef7a614eb5a201a1ef7b0d8d87b5fae3c3749bb77bc7028ef8a9bcabc50d",
                "finalProjectionSha256": "2542ef7a614eb5a201a1ef7b0d8d87b5fae3c3749bb77bc7028ef8a9bcabc50d",
                "counters": {
                  "opportunities": 11998366,
                  "raises_total": 3527260,
                  "regular_raise": 3267365,
                  "open_shove": 259895,
                  "limp": 226697,
                  "fold_other": 8244409,
                  "shove_allin_flag": 251351,
                  "shove_effective_amount_only": 8544,
                  "regular_three_bb_open": 285409,
                  "normal_three_bb_as_shove": 0,
                  "non_exact_r_effective_allin": 120070
                },
                "exact": true
              }
            }
          }
        },
        "supplementSource": {
          "schema": "ff-rfi-field-action-novel-raw-supplement-merge-v1",
          "sourceKind": "publication-safe-novel-raw-hh-l3top",
          "strategy": "approved-plan-source-union-with-observed-zero-dimension-completion",
          "manifestSha256": "4c32b6dd5ce753d97a1310fa337abaa3370ac5fd57846df7dacca17880e34c1a",
          "aggregate": {
            "sha256": "e481e2d73534438cd9cb06dcc7a08061ec49d25cc330bc912696cbb92a16b259",
            "bytes": 1397736,
            "rows": 9126
          },
          "plan": {
            "schema": "ff-rfi-coin-party-publication-run-plan-v2",
            "sha256": "cc14e2a33704ddcd4e98c5baf43768c26980706b0ed7b12814982da858e054fe",
            "sourceSetComplete": true,
            "networks": [
              "CoinPoker",
              "PartyPoker"
            ],
            "userShardsPerNetwork": 4,
            "expectedExecutions": 8,
            "exactDisjointUserUnion": true,
            "targetFilter": false
          },
          "parserValidation": {
            "schema": "ff-rfi-coin-party-parser-validation-v2",
            "sha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
            "gatePassed": true,
            "networks": [
              "CoinPoker",
              "PartyPoker"
            ],
            "exactMismatchTolerance": 0,
            "validatedAt": "2026-07-26T20:18:11.042Z",
            "binding": {
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserImplementationSha256": "673a2d5967625a6874e5acade450269fc30677cb786418a85af593b77e407d3e",
              "grammarSha256": "e570a7271fd8dbff3c90bb840335f28eda10f63094065c57b8c4c328170e8f06",
              "membershipSha256": "fade4601523caf87ab7c0a4b759b6d79161f6df44f2e8da2781a90184e5dec2d",
              "userIdsSha256": "322fabfabb4ab4b6359c6720125dfb534525559e854c95fff79b9c1b11ccc771",
              "window": [
                "2023-09-01",
                "2026-07-26"
              ]
            },
            "source": {
              "inputSha256": "2d1e2323a6d497b85b94d6278249dc3e9d78cce2c52477936021d5b9046592f6",
              "inputBytes": 2859078,
              "rows": 1366,
              "uniqueUsers": 22,
              "firstObservedAt": "2026-02-08T00:19:28Z",
              "lastObservedAt": "2026-07-20T20:39:15Z",
              "rawHandHistoriesPublished": false,
              "personalIdentifiersPublished": false
            }
          },
          "inputs": [
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "CoinPoker",
              "userShard": {
                "index": 0,
                "count": 4,
                "users": 61,
                "userIdsSha256": "cfc8e4970f47a35ff8cd2b86d898e56f250707e67b88a494335cec017ac33ead"
              },
              "queryJobId": "mcp_ch_job_c3e99be74bfe4a58899c127bf7788671",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:16:18.175Z",
              "finishedAt": "2026-07-26T21:17:51.153Z",
              "rendererMetadataSha256": "21ac7216cc3ebfbb24e8ed45c9afd742afb20668e2174cf79c3827306226b775",
              "receiptSha256": "d2fc5f2ec53dbbd39292bb645a9925d7ba98a1c77822a02f4b796202e12c51ae",
              "querySha256": "fda32aa2720daee22f931f32a200950bb6fa10f4d5fd0466c4e12fb57766db6f",
              "resultSha256": "cc24f9493667cb49ac4d895e9e9bc9f8c408ae93a894717b1cc09e0e392d244f",
              "resultRows": 2029,
              "resultBytes": 431332,
              "observedStates": 54,
              "observedCells": 2029,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 239712,
                "exact_id_match_keys": 224158,
                "nominal_novel_keys": 15554,
                "normalized_time_eligible_keys": 15472,
                "publication_eligible_keys": 15472
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "CoinPoker",
              "userShard": {
                "index": 1,
                "count": 4,
                "users": 61,
                "userIdsSha256": "f5ea01467f0dfcc1cad762b73a146e87604d5d85307a5146f54767de9cc6eae6"
              },
              "queryJobId": "mcp_ch_job_a33728d567894179adca67b5e8a5bcb3",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:17:51.262Z",
              "finishedAt": "2026-07-26T21:19:11.867Z",
              "rendererMetadataSha256": "37725f129abefdd0a10d60e51d609fda9fd10b2fcb0f506e46b4cddb2d541c73",
              "receiptSha256": "7d516d6ccd31947664c016264ed4f0aabf24d1ee7f9a5e6564e84d22d8d6187e",
              "querySha256": "928a7f1bbed6e872566010fb3df0012f8f51cf4746d7ae9b02cf7a2d7a98781b",
              "resultSha256": "232dee21707394caa73082f474aa31281e69a7adae006eb29b1a3afdd09089d6",
              "resultRows": 395,
              "resultBytes": 82760,
              "observedStates": 46,
              "observedCells": 395,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 256962,
                "exact_id_match_keys": 252714,
                "nominal_novel_keys": 4248,
                "normalized_time_eligible_keys": 4241,
                "publication_eligible_keys": 4241
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "CoinPoker",
              "userShard": {
                "index": 2,
                "count": 4,
                "users": 61,
                "userIdsSha256": "eaa2cc78f8ff1451f5f0bf4d9d919a06a79743206074a92d2990dce4b9260744"
              },
              "queryJobId": "mcp_ch_job_ee654e01fec1471790d6e34b2caf1c15",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:25:42.446Z",
              "finishedAt": "2026-07-26T21:26:55.242Z",
              "rendererMetadataSha256": "c355bf1f1f9cf0e16a2cb6001401752e4b40dd87bddcaea5c222056f88ec1166",
              "receiptSha256": "4294a9c8e0e347a7536372e81dcf13389b34dae0e922e0e5e0106c913713a2dd",
              "querySha256": "c97a93a12cc1426ece941d0580ab946545563a6938adf3c2718e40aa86cb8d43",
              "resultSha256": "251f9d1a43774516e47425f607682e02458f6875066c69dcaaaff470f02a1f27",
              "resultRows": 10,
              "resultBytes": 2786,
              "observedStates": 10,
              "observedCells": 10,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 153521,
                "exact_id_match_keys": 153476,
                "nominal_novel_keys": 45,
                "normalized_time_eligible_keys": 45,
                "publication_eligible_keys": 45
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "CoinPoker",
              "userShard": {
                "index": 3,
                "count": 4,
                "users": 61,
                "userIdsSha256": "43e19fa97726b70547d00016a202f01003daf5add9b73e1c76fb042c60353b37"
              },
              "queryJobId": "mcp_ch_job_8870a5aba6134e63a005e72771c0eb57",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:21:32.141994Z",
              "finishedAt": "2026-07-26T21:22:42.542018Z",
              "rendererMetadataSha256": "2a4bfdf4ef756bc77d650c2a5499d0f79a80459e4632856b9e222998cb6c1d6d",
              "receiptSha256": "addab024da21c366374a24f8debe6de8d2d9d7a062b1ece9fdc2d438c2e1e6de",
              "querySha256": "dfc0efb0aaf9b9af2150ee157f294a701a0fcc0c8d980cce60c11dad1e2b401e",
              "resultSha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
              "resultRows": 0,
              "resultBytes": 1,
              "observedStates": 0,
              "observedCells": 0,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 1432,
                "exact_id_match_keys": 0,
                "nominal_novel_keys": 1432,
                "normalized_time_eligible_keys": 1,
                "publication_eligible_keys": 1
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "PartyPoker",
              "userShard": {
                "index": 0,
                "count": 4,
                "users": 61,
                "userIdsSha256": "cfc8e4970f47a35ff8cd2b86d898e56f250707e67b88a494335cec017ac33ead"
              },
              "queryJobId": "mcp_ch_job_aaf3243f703a4f5f873083b62ee759cb",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:22:42.542018Z",
              "finishedAt": "2026-07-26T21:24:40.044409Z",
              "rendererMetadataSha256": "50bd930d88e8cc910a222ad0452e9a49296c894417b0dfadf6bc7fa2586ed160",
              "receiptSha256": "60cc57f1ea564b41fc40b368649e9d082f1b97304c6d7f8e56be1c3291d647fd",
              "querySha256": "1316f2b36ccbe8fc913047b8ee84380701240bbbc7fc41f2567007c892479e50",
              "resultSha256": "84824a78f03339f42bab33e75d680d19b87eb3422e63a0b7b7ba2f344d9aa9ad",
              "resultRows": 340,
              "resultBytes": 71026,
              "observedStates": 42,
              "observedCells": 340,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 84747,
                "exact_id_match_keys": 82837,
                "nominal_novel_keys": 1910,
                "normalized_time_eligible_keys": 1910,
                "publication_eligible_keys": 1910
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "PartyPoker",
              "userShard": {
                "index": 1,
                "count": 4,
                "users": 61,
                "userIdsSha256": "f5ea01467f0dfcc1cad762b73a146e87604d5d85307a5146f54767de9cc6eae6"
              },
              "queryJobId": "mcp_ch_job_14238c749c9c4c1c915b801461fa2fbe",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:55:38.441425Z",
              "finishedAt": "2026-07-26T21:56:52.678738Z",
              "rendererMetadataSha256": "408f4e69498d72bd55325de0acd37229c8363819533f733a1e92c6d580262ffb",
              "receiptSha256": "9f8ad78e071acd59b17c9a64b76607115561450bbcc5bb2bdee2fdad44f8e28e",
              "querySha256": "da6cf155f75cc3efa4f5dfe50344cb5dcd2b01038cc5bdf64b28009cebfde225",
              "resultSha256": "977986c3bf0403ae17f47fd569bfbd334f1a9d7ff10c6c47467022ccd67fcb49",
              "resultRows": 747,
              "resultBytes": 157079,
              "observedStates": 47,
              "observedCells": 747,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 109986,
                "exact_id_match_keys": 104063,
                "nominal_novel_keys": 5923,
                "normalized_time_eligible_keys": 5918,
                "publication_eligible_keys": 5918
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "PartyPoker",
              "userShard": {
                "index": 2,
                "count": 4,
                "users": 61,
                "userIdsSha256": "eaa2cc78f8ff1451f5f0bf4d9d919a06a79743206074a92d2990dce4b9260744"
              },
              "queryJobId": "mcp_ch_job_0b0d39e1b59a440fbbf89ed4b573b892",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:24:40.044409Z",
              "finishedAt": "2026-07-26T21:25:42.446343Z",
              "rendererMetadataSha256": "bbb65df14fdf70e0e34c923da7e84ba6f0b2d3b1272fbb6d908a1c171fea2450",
              "receiptSha256": "136d13c557aacde9606eb0abdfef628f74a2f9b06a151e7a054ba5b948194e68",
              "querySha256": "d3db51d3256fa942dac42728e72c464e158639d632a3318b85a05d3a6390e440",
              "resultSha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
              "resultRows": 0,
              "resultBytes": 1,
              "observedStates": 0,
              "observedCells": 0,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 0,
                "exact_id_match_keys": 0,
                "nominal_novel_keys": 0,
                "normalized_time_eligible_keys": 0,
                "publication_eligible_keys": 0
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            },
            {
              "sourceKind": "coin-party-publication-v2",
              "network": "PartyPoker",
              "userShard": {
                "index": 3,
                "count": 4,
                "users": 61,
                "userIdsSha256": "43e19fa97726b70547d00016a202f01003daf5add9b73e1c76fb042c60353b37"
              },
              "queryJobId": "mcp_ch_job_7fb8505f397445a9a54c095beb6aaba3",
              "executionMode": "async",
              "startedAt": "2026-07-26T21:19:11.867143Z",
              "finishedAt": "2026-07-26T21:20:18.359604Z",
              "rendererMetadataSha256": "4cc28d647b6e8f982c8ae581fdbc62091b2681729910d63386f2d6db7f6e4743",
              "receiptSha256": "36b1a00667a6ab5e76a809a78ae78dd0d31a3c6e1ee49dbf7b1a27b82ab08c04",
              "querySha256": "1f533b5d928b6479ef30eb9a921daeda897a0304016a71393d072cebf8e29d78",
              "resultSha256": "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
              "resultRows": 0,
              "resultBytes": 1,
              "observedStates": 0,
              "observedCells": 0,
              "templateSha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
              "parserTemplateSha256": "1591cb91e194aa422ff90f8be73deed4cc18a82034a94cc6f85cbf73cf28f03f",
              "parserValidationSha256": "2eb8b6b5ad5be3740a41f6fad798b8207f738aee20691640302396283f9abf5b",
              "publicationGate": {
                "raw_keys": 3591,
                "exact_id_match_keys": 3591,
                "nominal_novel_keys": 0,
                "normalized_time_eligible_keys": 0,
                "publication_eligible_keys": 0
              },
              "windowStartInclusive": "2023-09-01T00:00:00Z",
              "windowEndExclusive": "2026-07-26T00:00:00Z",
              "privacy": {
                "aggregateOnly": true,
                "noRawHandHistories": true,
                "noPlayerLevelRows": true,
                "noUserIds": true
              }
            }
          ],
          "densification": {
            "observedInputRows": 3521,
            "observedInputCells": 3521,
            "canonicalOutputCells": 9126,
            "absentDimensionsMaterializedAsObservedZero": true,
            "smoothingApplied": false,
            "modeledValuesApplied": false
          }
        },
        "supplement": {
          "l3topAdditive": {
            "exactCells": 9126,
            "stateCount": 54,
            "counters": {
              "opportunities": 5108,
              "raises_total": 1390,
              "regular_raise": 1253,
              "open_shove": 137,
              "limp": 86,
              "fold_other": 3632,
              "shove_allin_flag": 113,
              "shove_effective_amount_only": 24,
              "regular_three_bb_open": 120,
              "normal_three_bb_as_shove": 0,
              "non_exact_r_effective_allin": 0
            },
            "eligibleDelta": 5108,
            "knownCardDelta": 5108,
            "opportunitiesDelta": 5108,
            "lookupMismatchDelta": 0,
            "deltaProjectionSha256": "bb6edfff09195b62076d6fe5680db2f8bc5c526a0f00e86058d982f6f0c4f40d",
            "nonnegativePerCell": true,
            "appliedExactly": true
          },
          "l3Delta": {
            "exactCells": 9126,
            "stateCount": 54,
            "counters": {
              "opportunities": 5108,
              "raises_total": 1390,
              "regular_raise": 1253,
              "open_shove": 137,
              "limp": 86,
              "fold_other": 3632,
              "shove_allin_flag": 113,
              "shove_effective_amount_only": 24,
              "regular_three_bb_open": 120,
              "normal_three_bb_as_shove": 0,
              "non_exact_r_effective_allin": 0
            },
            "eligibleDelta": 5108,
            "knownCardDelta": 5108,
            "opportunitiesDelta": 5108,
            "lookupMismatchDelta": 0,
            "deltaProjectionSha256": "bb6edfff09195b62076d6fe5680db2f8bc5c526a0f00e86058d982f6f0c4f40d",
            "cloneEqualsL3top": true,
            "nonnegativePerCell": true,
            "appliedExactly": true
          },
          "preserved": {
            "l2": {
              "rows": 9126,
              "sourceProjectionSha256": "771585e91118dbaf8fb7ba4286a30b11431335a1325979dd95c27653dad131d6",
              "finalProjectionSha256": "771585e91118dbaf8fb7ba4286a30b11431335a1325979dd95c27653dad131d6",
              "counters": {
                "opportunities": 24591799,
                "raises_total": 7321984,
                "regular_raise": 6743509,
                "open_shove": 578475,
                "limp": 401089,
                "fold_other": 16868726,
                "shove_allin_flag": 560178,
                "shove_effective_amount_only": 18297,
                "regular_three_bb_open": 632121,
                "normal_three_bb_as_shove": 0,
                "non_exact_r_effective_allin": 227177
              },
              "exact": true
            },
            "l1": {
              "rows": 9126,
              "sourceProjectionSha256": "2542ef7a614eb5a201a1ef7b0d8d87b5fae3c3749bb77bc7028ef8a9bcabc50d",
              "finalProjectionSha256": "2542ef7a614eb5a201a1ef7b0d8d87b5fae3c3749bb77bc7028ef8a9bcabc50d",
              "counters": {
                "opportunities": 11998366,
                "raises_total": 3527260,
                "regular_raise": 3267365,
                "open_shove": 259895,
                "limp": 226697,
                "fold_other": 8244409,
                "shove_allin_flag": 251351,
                "shove_effective_amount_only": 8544,
                "regular_three_bb_open": 285409,
                "normal_three_bb_as_shove": 0,
                "non_exact_r_effective_allin": 120070
              },
              "exact": true
            }
          }
        },
        "final": {
          "aggregate": {
            "sha256": "12271ff6005957d0fe58fd24066195dfc90e04544228af207e4ce3296daeed3b",
            "bytes": 6723030,
            "rows": 36504,
            "windowStartInclusive": "2023-09-01T00:00:00Z",
            "windowEndExclusive": "2026-07-26T00:00:00Z",
            "knownCards": {
              "eligible": 74722772,
              "known": 65334010,
              "lookupMismatch": 725832,
              "pct": 87.435206
            },
            "totals": {
              "opportunities": 65334010,
              "raises_total": 19294369,
              "regular_raise": 17785457,
              "open_shove": 1508912,
              "limp": 1031064,
              "fold_other": 45008577,
              "shove_allin_flag": 1468336,
              "shove_effective_amount_only": 40576,
              "regular_three_bb_open": 1616066,
              "normal_three_bb_as_shove": 0,
              "non_exact_r_effective_allin": 569006
            },
            "cube": {
              "stateCount": 216,
              "rowCount": 36504,
              "handClassesPerState": 169,
              "coverageReconciled": true
            }
          },
          "privacy": {
            "aggregateOnly": true,
            "rawHandHistoriesPublished": false,
            "personalIdentifiersPublished": false
          }
        }
      },
      "classifierSanity": {
        "70+": {
          "openShoves": 1351,
          "shoveAllinFlag": 1336,
          "shoveEffectiveAmountOnly": 15,
          "regularThreeBbOpens": 635194,
          "normalThreeBbAsShove": 0,
          "nonExactREffectiveAllin": 78955
        },
        "30-70": {
          "openShoves": 11916,
          "shoveAllinFlag": 11664,
          "shoveEffectiveAmountOnly": 252,
          "regularThreeBbOpens": 665554,
          "normalThreeBbAsShove": 0,
          "nonExactREffectiveAllin": 259725
        },
        "20-30": {
          "openShoves": 86375,
          "shoveAllinFlag": 84386,
          "shoveEffectiveAmountOnly": 1989,
          "regularThreeBbOpens": 210720,
          "normalThreeBbAsShove": 0,
          "nonExactREffectiveAllin": 127721
        },
        "15-20": {
          "openShoves": 250942,
          "shoveAllinFlag": 245550,
          "shoveEffectiveAmountOnly": 5392,
          "regularThreeBbOpens": 68416,
          "normalThreeBbAsShove": 0,
          "nonExactREffectiveAllin": 58733
        },
        "<15": {
          "openShoves": 1158328,
          "shoveAllinFlag": 1125400,
          "shoveEffectiveAmountOnly": 32928,
          "regularThreeBbOpens": 36182,
          "normalThreeBbAsShove": 0,
          "nonExactREffectiveAllin": 43872
        }
      },
      "actionCountReconciliation": {
        "source": {
          "opportunities": 65334010,
          "regularRaise": 17785457,
          "openShove": 1508912,
          "limp": 1031064,
          "foldOther": 45008577
        },
        "aggregated": {
          "opportunities": 65334010,
          "regularRaise": 17785457,
          "openShove": 1508912,
          "limp": 1031064,
          "foldOther": 45008577
        }
      },
      "exactActionCounterTotals": {
        "opportunities": 65334010,
        "raises_total": 19294369,
        "regular_raise": 17785457,
        "open_shove": 1508912,
        "limp": 1031064,
        "fold_other": 45008577,
        "shove_allin_flag": 1468336,
        "shove_effective_amount_only": 40576,
        "regular_three_bb_open": 1616066,
        "normal_three_bb_as_shove": 0,
        "non_exact_r_effective_allin": 569006
      },
      "cohortActionCounterTotals": {
        "l3top": {
          "opportunities": 5650422,
          "raises_total": 1657850,
          "regular_raise": 1533756,
          "open_shove": 124094,
          "limp": 75926,
          "fold_other": 3916646,
          "shove_allin_flag": 121427,
          "shove_effective_amount_only": 2667,
          "regular_three_bb_open": 136900,
          "normal_three_bb_as_shove": 0,
          "non_exact_r_effective_allin": 40086
        },
        "l3": {
          "opportunities": 23093423,
          "raises_total": 6787275,
          "regular_raise": 6240827,
          "open_shove": 546448,
          "limp": 327352,
          "fold_other": 15978796,
          "shove_allin_flag": 535380,
          "shove_effective_amount_only": 11068,
          "regular_three_bb_open": 561636,
          "normal_three_bb_as_shove": 0,
          "non_exact_r_effective_allin": 181673
        },
        "l2": {
          "opportunities": 24591799,
          "raises_total": 7321984,
          "regular_raise": 6743509,
          "open_shove": 578475,
          "limp": 401089,
          "fold_other": 16868726,
          "shove_allin_flag": 560178,
          "shove_effective_amount_only": 18297,
          "regular_three_bb_open": 632121,
          "normal_three_bb_as_shove": 0,
          "non_exact_r_effective_allin": 227177
        },
        "l1": {
          "opportunities": 11998366,
          "raises_total": 3527260,
          "regular_raise": 3267365,
          "open_shove": 259895,
          "limp": 226697,
          "fold_other": 8244409,
          "shove_allin_flag": 251351,
          "shove_effective_amount_only": 8544,
          "regular_three_bb_open": 285409,
          "normal_three_bb_as_shove": 0,
          "non_exact_r_effective_allin": 120070
        }
      },
      "knownCards": {
        "eligible": 74722772,
        "known": 65334010,
        "lookupMismatch": 725832,
        "firstObservedAt": "2023-09-01 00:01:00",
        "lastObservedAt": "2026-07-25 23:55:11",
        "pct": 87.435206
      },
      "positionOpportunities": {
        "l3top": {
          "EP": 1799953,
          "MP": 1378199,
          "HJ": 1022512,
          "CO": 724508,
          "BTN": 474609,
          "SB": 250641
        },
        "l3": {
          "EP": 7316811,
          "MP": 5618293,
          "HJ": 4177905,
          "CO": 2974554,
          "BTN": 1958588,
          "SB": 1047272
        },
        "l2": {
          "EP": 7646186,
          "MP": 5957669,
          "HJ": 4496319,
          "CO": 3234071,
          "BTN": 2127951,
          "SB": 1129603
        },
        "l1": {
          "EP": 3713018,
          "MP": 2915249,
          "HJ": 2210782,
          "CO": 1589751,
          "BTN": 1033791,
          "SB": 535775
        }
      },
      "extractionSql": null,
      "extractionSqlSha256": null,
      "extractionTemplates": [
        {
          "path": "tools/q_ff_rfi_field_actions.sql",
          "sha256": "9e06fa18c5889fd12e00cab250af6dc17ad1d543f4ef67a4cbf65351c6093cde",
          "role": "canonical-structured-cube"
        },
        {
          "path": "tools/q_ff_rfi_missing_cards_recovery.sql",
          "sha256": "56a80f377f72dfb1f52e42b9157509419ed1c04dd30dfc1045503051e2540533",
          "role": "l3top-missing-card-recovery"
        },
        {
          "path": "tools/q_ff_rfi_coin_party_publication.sql",
          "sha256": "0b6acbf4de9db67c4c69751ee7d465fa01bfbcfe06253eae7c9a5342d5507959",
          "role": "current-coin-party-publication-supplement"
        }
      ]
    }
  },
  "recommendations": {
    "source": null,
    "smoothing": null,
    "charts": {}
  },
  "cohorts": {
    "l3top": {
      "label": "Лига 3 · топ-25%",
      "shortLabel": "Лига 3 · топ-25%",
      "ranks": "текущая Лига 3",
      "description": "Верхний квартиль по FFEV среди всех активных реальных игроков текущей Лиги 3.",
      "players": 244,
      "selectedPlayers": 244,
      "charts": {
        "70+": {
          "EP": {
            "n": "dQsAAMUHAACaBwAAygcAAFsHAADeBwAAywcAAIoHAAB8BwAAgwcAAEYHAADTBwAAiAcAAMcWAABZCwAAZwcAAIoHAAB+BwAAfQcAADQHAABuBwAAZAcAAJ0HAACzBwAAKwcAAMMHAAAUFwAAfBYAAHQLAAC/BwAAeQcAAIIHAACDBwAAfwcAAGkHAAC2BwAAnwcAAEsHAACbBwAAohYAABgWAACnFgAAcgsAAJoHAABMBwAAUwcAAGMHAADnBwAAfAcAAFwHAABnBwAAbgcAAMsWAADRFgAAqxYAAF8WAACiCwAAxAcAAIQHAABdBwAATAcAAKUHAAA5BwAALwcAAJ8HAABAFgAArRYAAGIWAADLFgAA4BUAANgLAACkBwAAlQcAAHUHAACnBwAAigcAALQHAAB3BwAATRYAAIUWAADzFgAA3xYAAHsWAAC3FgAAdQsAAHAHAABzBwAAKgcAAF0HAABeBwAAvwcAAOgWAACCFgAANhYAACEWAAB1FgAApxYAAHwWAABBCwAAdwcAALcHAABxBwAAGwcAAJ4HAABhFgAAXhYAAGsWAABSFgAAwBYAADYWAABpFgAAPBYAAIELAACxBwAAXQcAAGYHAABjBwAAxBUAAD8WAAAaFgAATRYAAJcWAAAPFwAAOxYAAPMWAAC9FgAAOQsAAGsHAABzBwAAfQcAAF8WAAAcFgAAbRYAAH0WAABNFgAAoRYAAH8WAADyFQAAhBYAAKQWAADrCgAAdQcAAHYHAABoFgAAcRYAANkWAACgFgAAMhYAABkXAACcFgAArRYAANQVAABgFgAAQhYAADMLAACCBwAAbBYAAKUWAAAzFgAAjhYAAMIVAABLFgAA0xYAAAMWAACaFgAAehYAAFgWAAA3FgAAHAsAAA==",
            "r": "1APeA94D3gPeA94D1APUA8oD1APKA8ADogPeA94D3gPeA9QDtgM+A4oCDgG0AIIAeABkAN4D3gPeA94D1AOYA9oCUAAUAAoAAAAKAAoA3gOYA/QB3gPUA5gD7gIyAAoACgAAAAAAAADKA5ABGAEiAd4DwAOUAjIACgAAAAAAAAAAAA4BCgAAAAAACgDeA44DggAUAAAAAAAAAAAAjAAAAAAAAAAAAAAA3gNwA1oAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAN4DNAMeAAoAAAAAAAoAAAAAAAAAAAAAAAAAAADUA9ACFAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAwAMsAQoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAHoDHgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAACeAgoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 636237,
            "raisePct": 22,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 22,
            "completeCells": 169,
            "minimumCellOpportunities": 1819
          },
          "MP": {
            "n": "9AgAALsFAADKBQAAlQUAAJMFAAB/BQAAvgUAAHIFAACUBQAAiQUAAKUFAACjBQAA0QUAAHIRAAC9CAAAZQUAAN4FAACiBQAAcgUAAJ4FAACZBQAAfQUAAGwFAACGBQAAiwUAAEkFAACIEQAAsxEAAJcIAADPBQAAvQUAAKAFAABQBQAAvgUAAIcFAABeBQAAPwUAAF4FAACIBQAA9RAAAGURAAA4EQAAkggAAIEFAAC1BQAAmQUAANAFAACWBQAAjgUAAF4FAAB8BQAAXAUAABERAADPEAAAUxAAALsQAADDCAAAyAUAAK8FAACZBQAAgQUAAHgFAACmBQAAjAUAAGkFAAACEQAAvBAAALcQAACuEAAAexAAAJYIAACEBQAAbgUAAFkFAABpBQAAcwUAAIgFAACKBQAAPBEAAMcQAABfEAAArRAAAJAQAAATEAAAeggAAHgFAACQBQAAjQUAAJMFAAB5BQAAhgUAAAIRAABOEAAAqhAAANgQAAArEAAA1A8AAI8QAABWCAAATwUAAHYFAACcBQAAewUAAIgFAACREAAADREAAIUQAACTEAAA1xAAAF8QAAAKEAAAbxAAAJMIAACMBQAAiQUAAGUFAACfBQAA9RAAAJMQAABjEAAA4hAAALQQAABGEAAAIhAAAFIQAADKEAAAowgAAIwFAABYBQAAZAUAAGkQAAAjEQAADhAAAF8QAACeEAAASxAAAMoQAABGEAAA/A8AAAkQAACXCAAAdAUAAFAFAAC7EAAA9xAAAJQQAACMEAAAgBAAAFsQAACgEAAAHhAAAA8QAAAtEAAAORAAACcIAABwBQAAvhAAAGoQAAB9EAAAshAAAL0QAACHEAAAPhAAADAQAADeDwAAgRAAANsPAABfEAAAXggAAA==",
            "r": "1APeA94D3gPeA94D3gPUA8oD3gPKA9QDwAPeA94D3gPeA94DygOYAyADYgLqAaQBVAEsAd4D3gPeA94D3gPAA2YDyAA8AB4ACgAKAAoA3gPKA1wD3gPeA7YDUgOgAAoAAAAAAAAACgDUAxYDsgKUAt4DygMMA4wAFAAKAAAAAAAAAHYCMgAKABQAHgDeA6wDIgEoAAoAAAAAAAAAkAEKAAoAAAAAAAoA3gOiA7QACgAAAAAAAABkAAAAAAAAAAAAAAAKANQDhAM8AAoAAAAAACgAAAAAAAAAAAAAAAAAAADUAyoDHgAAAAAAKAAAAAAAAAAAAAAAAAAAAAAA1APgAQoAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAMADPAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAB6AwoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 469938,
            "raisePct": 26,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 26,
            "completeCells": 169,
            "minimumCellOpportunities": 1343
          },
          "HJ": {
            "n": "awYAAA0EAAAKBAAAOgQAABYEAADzAwAAEgQAAPoDAAAQBAAANAQAADgEAAD2AwAAwwMAAHgMAADaBQAA7wMAAA0EAAA4BAAADQQAAN0DAADyAwAAsAMAALYDAADWAwAA8QMAAO8DAABODAAAEAwAACEGAAAhBAAA6wMAAAAEAAAABAAA5QMAAAEEAAC8AwAArgMAAOIDAAC9AwAAiwwAAAQMAABHDAAA4AUAABoEAAAABAAAywMAAOADAADQAwAA4gMAALgDAADVAwAAQgQAAGwMAABIDAAAlgsAAAsMAAApBgAACQQAAAgEAADVAwAAvQMAANkDAADGAwAAqwMAANcDAABBDAAA4wsAAPALAACTCwAA/AsAAPYFAADmAwAAwgMAALoDAAC6AwAAMgQAANIDAAD6AwAAXAwAANkLAAD3CwAAdQwAAMMLAACjCwAA8gUAAPoDAAD1AwAA6gMAAMADAADxAwAAywMAAEMMAAAXDAAAugsAAJELAAChCwAA7gsAAIALAAC0BQAA5QMAAKIDAAACBAAADQQAAOIDAADiCwAAVgwAAA4MAAC7CwAAZQsAAPgLAACqCwAABAsAAI0FAADSAwAA2wMAALUDAACyAwAAIgwAAJ4LAAC9CwAAsQsAAKsLAAB4CwAAbAsAAJkLAACCCwAAqQUAAMYDAACtAwAA2QMAAMQLAACwCwAA4AsAAN4LAAAgCwAAEwsAAGwLAAA6CwAAbwsAAH8LAADwBQAArAMAAKcDAABpDAAAbwsAAPULAABwCwAAuQsAAEgLAAA6CwAAeAsAABYLAABiCwAASgsAAK8FAACfAwAAAgwAAMwLAABqCwAApwsAAFMLAABwCwAAQAsAAF4LAADpCwAA/QoAANELAAAkCwAAswUAAA==",
            "r": "1APoA94D3gPeA94D3gPUA9QD1APUA9QD1APeA9QD6APeA94D1APAA3ADKgPuAp4CdgJEAt4D3gPeA94D3gPUA44DlAIEAYwAWgBQADwA3gPUA8AD3gPoA9QDogM6AlAAMgAeAAoAFADeA6IDZgNSA94D1ANwAwgCWgAKAAoACgAAAGYDfAFuAFoANgHeA8oDigJuABQACgAAAAAA0AIyAB4AHgAUAB4A3gPAA+oBPAAKAAAAAADqAR4AAAAAAAAACgAUAN4DmAOqACgACgAAAKAACgAAAAAAAAAAAAAACgDeA1wDWgAUAAAAoAAKAAAAAAAAAAAAAAAAAAAA1AOKAigACgBaAAAAAAAAAAAAAAAAAAAAAAAAANQDeAAKAEYAAAAAAAAAAAAAAAAAAAAAAAAAAADAAxQAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmAM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 331681,
            "raisePct": 30,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 30,
            "completeCells": 169,
            "minimumCellOpportunities": 927
          },
          "CO": {
            "n": "dQQAAOICAACtAgAA4AIAAMICAADgAgAA0gIAAMYCAACvAgAAvAIAALsCAACwAgAAsQIAAF0IAAAwBAAAwwIAAL8CAADVAgAAswIAAK8CAAC+AgAAigIAAH0CAACcAgAAcgIAAJACAAB8CAAALwgAAEcEAACbAgAAegIAAKsCAAB9AgAApwIAAKoCAACQAgAAlQIAAK0CAABTAgAAoQgAADMIAADvBwAAGQQAAL4CAACTAgAAkgIAAMsCAACUAgAAmgIAAIECAACvAgAAbAIAAK4IAADwBwAA7AcAAAYIAABABAAAywIAAGgCAACDAgAAoAIAALYCAADRAgAAhAIAAIICAAD2BwAAzQcAAOYHAACUBwAAzAcAALEDAABlAgAAgAIAAGwCAACsAgAAhQIAAJUCAABpAgAAXQgAAM0HAAC4BwAAAAgAAO8HAAC6BwAAtwMAAJMCAABzAgAAoAIAAGECAABxAgAAfAIAANsHAADxBwAAvgcAALAHAADlBwAAngcAAGIHAADTAwAAfgIAAGYCAAB5AgAAcQIAAGECAAAMCAAAxAcAAKgHAACpBwAA5wcAANEHAACYBwAAcwcAAK8DAABlAgAAeQIAAHQCAACHAgAAFAgAALIHAACoBwAAjAcAAHIHAABkBwAAYgcAAHMHAABtBwAAtAMAAGECAABvAgAATQIAADMIAADJBwAAvAcAALsHAACmBwAAfQcAAJgHAACOBwAAfQcAABEHAACPAwAAYwIAAFcCAADwBwAAhAcAAM0HAACXBwAAMwcAAJ8HAAD1BgAAUQcAAFsHAAAqBwAAawcAAJgDAACFAgAARQgAAJ8HAACJBwAAZgcAAKIHAAB6BwAAeAcAAHgHAABABwAATgcAAEYHAABiBwAAsQMAAA==",
            "r": "3gPeA+gD3gPoA94D3gPeA94D3gPeA94D3gPoA94D3gPeA94D1APUA8ADrAOOA3ADZgM+A94D3gPeA94D3gPUA9QDmAMWA+QCngKAAk4C3gPeA9QD6APoA9QDygNmA7ICCAK4AQ4ByADeA8oDtgO2A94D3gO2AyoDYgLSAGQAUAAyAMADIAPGAp4CvALeA9QDegNsArQAPAAoAB4ArANsAhICzAGGAcwB3gPUAzQDmgFaACgAHgBwA5ABRgA8ACgAPAC0AN4DwANsAqAAPAAoABYDbgAeAAoACgAUAB4AWgDeA6IDuAF4AB4AKgNGABQACgAAAAAAAAAKADIA1AM0A6AAPADaAjIACgAAAAAAAAAAAAAACgAUAN4DcgE8AMYCHgAKAAAAAAAAAAAAAAAAAAAACgDUA24AYgIoAAoACgAAAAAAAAAAAAAAAAAAAAAAygM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 218416,
            "raisePct": 43,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 43,
            "completeCells": 169,
            "minimumCellOpportunities": 589
          },
          "BTN": {
            "n": "5AIAANkBAACnAQAAqAEAAKsBAACtAQAAqgEAAIUBAACpAQAAggEAAJMBAACzAQAAjwEAACoFAACNAgAAnQEAALoBAACvAQAAkQEAAHgBAAB8AQAAcAEAAJ8BAAB/AQAAlAEAAHEBAAA4BQAAywQAAIICAACsAQAApgEAAHgBAACCAQAAZwEAAKkBAAB6AQAAUwEAAGYBAAB2AQAANwUAAAkFAAC1BAAASgIAAGcBAACCAQAAhgEAAIEBAACDAQAAcQEAAJ4BAACHAQAAZQEAAC4FAADvBAAAzAQAAKEEAABEAgAAmwEAAHIBAACXAQAAeQEAAJMBAAB8AQAAdAEAAKIBAAD/BAAAeQQAAJsEAACKBAAAowQAAB4CAACUAQAAeQEAAGYBAAB+AQAAeAEAAG8BAABuAQAAvAQAAJMEAACHBAAAdgQAAIkEAACCBAAASgIAAGcBAAB5AQAAbwEAAG4BAAB2AQAAdAEAAPMEAAC0BAAAfAQAAJAEAABtBAAAVQQAADQEAAAmAgAAewEAAFwBAABrAQAAmQEAAGMBAAC2BAAAcAQAAHAEAABsBAAAfwQAAEAEAAA/BAAAPgQAABYCAAB5AQAAbgEAAEsBAABNAQAAwQQAAKYEAAByBAAAWwQAAHcEAABsBAAAbAQAAIgEAABKBAAAEAIAAFIBAABXAQAAZAEAAJwEAABnBAAAVAQAAJkEAAB7BAAAPAQAAHUEAABxBAAAYQQAAEoEAAAgAgAAaQEAAGkBAADRBAAAnwQAAHYEAACWBAAATQQAAF4EAABSBAAAJwQAADAEAAD9AwAAEwQAAAACAABKAQAA4QQAAHIEAABLBAAAWAQAAGsEAABOBAAABgQAABIEAAAxBAAAHQQAAF0EAAAVBAAAAQIAAA==",
            "r": "3gPoA94D3gPoA94D3gPeA94D3gPoA9QD1APeA94D6APeA+gD3gPeA94D3gPKA8oDwAOsA94D3gPoA+gD3gPeA9QD1AOsA5gDjgOYA3oD3gPeA94D6APeA94D1AO2A7YDcAM0A1IDFgPeA94D1APeA9QD3gPeA7YDjgMgA+QC5ALGAt4DrAOYA44DegPeA+gDtgOOA0gD+ALGApQC1AOEA1IDPgMCAz4D3gPeA7YDZgMCA5QCYgLKAz4D2gKeAmICgAIMA+gD1AOEAwID2gJYArYDKgOyAuoB1gHMAToC5ALeA9QDUgPuAmICwAP4AjoCGAGqAL4A5gB8AWwC1AOsA/gCigKsA9AC9AHSAIwAeAB4AIwA0gCuAd4DZgN2AqwDngLMAdIAZABQAEYAUAB4AG4AvgDeA2ICmAOKArgBlgBQAFAAPAA8ADIARgBaAFAA1AM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 127433,
            "raisePct": 67,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 67,
            "completeCells": 169,
            "minimumCellOpportunities": 330
          },
          "SB": {
            "n": "KgEAALUAAAC9AAAArAAAAKIAAAC8AAAAxwAAALQAAAC9AAAAoQAAAKIAAACaAAAAmAAAAAgCAAAKAQAAtAAAAKQAAAC0AAAAmQAAAKIAAAClAAAAhQAAAKcAAACdAAAAmgAAAJkAAAAiAgAABwIAAAwBAACSAAAArwAAAJ4AAACfAAAAsAAAAK8AAACnAAAAgQAAAJQAAACYAAAAPQIAAPgBAADyAQAACgEAAJMAAACxAAAAnQAAAKIAAACJAAAAogAAAJYAAACSAAAAjAAAABQCAAAaAgAA0gEAAP8BAADrAAAAsgAAAJMAAACOAAAAlQAAAIQAAACYAAAAmwAAAKQAAAAGAgAABAIAAPMBAAD7AQAA7wEAAOgAAACeAAAAlwAAAJoAAACmAAAAngAAAJ4AAACLAAAA1AEAAPkBAAD0AQAA3QEAAN0BAAC8AQAA7gAAAJsAAACbAAAAlgAAAI4AAACGAAAAlAAAAOgBAADUAQAA3gEAAM4BAAC1AQAAxQEAALEBAAC1AAAAjQAAAJcAAACQAAAAfwAAAJ4AAAARAgAA0wEAALoBAADlAQAAzAEAAKEBAADOAQAAlAEAAN4AAACPAAAAlwAAAJUAAACSAAAACQIAANcBAAC1AQAA0AEAALoBAADUAQAAogEAAKMBAACjAQAA0gAAAIAAAACWAAAAqAAAAP0BAADgAQAA0wEAANwBAADkAQAArQEAAH8BAACvAQAAkgEAAK4BAADOAAAAjQAAAH0AAADPAQAA0gEAANoBAADIAQAAmgEAALoBAAChAQAAowEAAKgBAACTAQAAiwEAAMUAAABwAAAA5gEAAMYBAAC6AQAAvAEAAKwBAADIAQAAoAEAAKUBAACSAQAAqgEAAJcBAACMAQAAvQAAAA==",
            "r": "jgN6A6IDtgOiA4QDegN6A1wDhANSA1wDXAPAA44DwAPAA44DmANSAz4DNAP4AvgCvALGAtQDtgPAA44DUgMgAwwDqAKAAoACdgKAAjoCygOsA3oDygOEAyAD7gKAAjoCbAJEAnYCCALAA3ADPgMWA8ADIAPuAsYCWAJOAjoCHALMAaIDKgPGAooCigLKA9oCigJYAggCpAHqAXIBegPkAnYCbAIIAggCogPGAkQCMAKGAeoBEgJ6A4oCEgLWAcIBuAH+AXADngI6AuoBkAGQAVwDbALWAZABkAGQAa4B6gFcA4ACEgKuAdYBSANYAswBhgEsAUoBNgGQAa4BFgPGAggCkAFIA1gCmgFeAUABNgE2ARgBQAFUAeQC9AGuAUgDYgKkAVQBDgEiARgBBAFAAQ4BNgHaAqQBIAMwApoBcgEiAfAAyADwACIB5gDwABgBbAI=",
            "j": "CgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "UABkADwAMgAyAFoAbgBkAHgARgB4AIIAggAeAFAAHgAeAEYARgCMAKAAqgDmANIADgEEARQAMgAeAFAAggC+ANIANgE2AVQBQAEYAXIBFAA8AGQAFABkAL4A8ABKAXwBQAFyASwBSgEeAG4AlgC+ABQAtADwABgBaAEiARgBaAGkATIAjADmAA4BIgEUAPoASgFoAXwB1gFyAa4BUADIACIBIgFyAZABMgAEAXwBhgHqAXIBQAFaAAQBNgFyAV4BmgGQAW4AQAGQAZoBrgFyAW4A+gBUAXIBaAF8AYYBhgGCAFQBuAHgAXwBeAD6AEABVAFyARgBfAFUAa4ByADwAIYBkAFuAPoANgFUAQ4BGAFKAUoBhgHMAfAArgHWAXgA8ABKARgBBAEEAfAAGAHcAGgBXgHwAOABjADwADYBGAH6AOYABAHwANIA8AAEAdwAaAE=",
            "opportunities": 51144,
            "raisePct": 60,
            "shovePct": 0,
            "limpPct": 24,
            "rfiPct": 60,
            "completeCells": 169,
            "minimumCellOpportunities": 112
          }
        },
        "30-70": {
          "EP": {
            "n": "lQwAACEIAAB/CAAApwgAAEIIAAA7CAAAVwgAAEAIAABPCAAAXAgAAEsIAAAGCAAASggAANcYAACJDAAApQgAAPUHAABACAAARAgAADsIAAAuCAAAVggAAAAIAABQCAAA+gcAAIcIAAC5GAAA1RgAAH4MAAA9CAAAIAgAACgIAABDCAAAXwgAADEIAAAqCAAA4QcAAB4IAAAYCAAA4RgAALAYAAAVGAAASgwAAAwIAABGCAAAKQgAABMIAACSCAAAGwgAAOAHAAA7CAAALQgAAAUZAABHGAAACxgAAMAYAAAoDAAAjwgAADwIAABBCAAA9gcAAE0IAAA+CAAAuggAAPkHAABaGAAA5BgAALUYAAD2FwAAxxgAAF4MAAA4CAAATggAAPwHAACpBwAADggAAC4IAADhBwAAKhkAAEIYAADEGAAA6hgAAA8ZAADVGAAAewwAAN4HAABfCAAAAQgAAAkIAABrCAAAVAgAAMQYAAA0GAAABxkAAJgYAAAqGAAAahgAAIEYAACQDAAASQgAAG4IAAAqCAAAKQgAAH0IAAA6GAAAAxgAAI4YAAAOGQAA/hgAAN4YAABtGAAAGBgAAJ4MAAA3CAAAOAgAABMIAABoCAAAoxgAAGwYAACtGAAAhBgAAHsYAABJGAAA3hgAAMoYAADuFwAAOgwAAGwIAAAQCAAAIwgAAJ4YAACyGAAApxgAADAYAADrGAAAIRgAAJgYAACaGAAAPBgAAHcYAAA3DAAADQgAAAoIAACjGAAAKxkAAMAYAADDGAAALhgAAA8YAADhGAAAkBgAAEYYAACZGAAAJxkAAAAMAADyBwAALhgAAL0YAAAmGAAATBgAANMYAAABGQAASRgAAHYYAADpGAAApBgAAJMYAACSGAAAXwwAAA==",
            "r": "1APUA94D3gPeA9QD1APKA6wDygOsA5gDcAPUA9QD3gPUA9QDmAP4AggC5gCMAGQAUAA8AN4D1APUA9QDygNmA3YCPAAUAAoACgAKAAAA3gNwA9YB3gPKA1IDdgIyAAoACgAKAAoACgDAA14B+gDwAN4DjgMSAigACgAKAAAAAAAAAAQBFAAKAAoACgDUA0gDZAAKAAAAAAAAAAAAeAAKAAAAAAAAAAoA3gMMAzwACgAAAAAAAAAoAAoAAAAAAAAAAAAAANQDxgIUAAoAAAAAABQAAAAAAAAAAAAAAAAAAADKA0QCCgAKAAAAFAAAAAAAAAAAAAAAAAAAAAAAmAPIAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAABYDFAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAASAgAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhgE=",
            "j": "AAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 695814,
            "raisePct": 21,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 1961
          },
          "MP": {
            "n": "BQoAAKEGAABTBgAAcwYAAIwGAACzBgAAawYAAIwGAACoBgAAdgYAAG0GAABaBgAAJAYAAIwTAAC2CQAA4wUAAGgGAACXBgAAqAYAAJgGAABPBgAANQYAAEcGAACtBgAADwYAAFkGAAC4EwAAaBMAAMUJAABhBgAAogYAAIIGAAAeBgAAogYAAFQGAABeBgAAMQYAAFoGAABYBgAA3hMAANgTAADuEgAAGQoAAI0GAABQBgAAKwYAAHsGAACJBgAAVgYAAEgGAAAmBgAAZwYAANgTAABXEwAAWhMAAGcTAAC8CQAAhgYAAFIGAACbBgAAbwYAAGMGAAAkBgAAbgYAAEUGAABxEwAAGhMAAP8SAAAOEwAAdRMAAF4JAACFBgAAEgYAAJwGAAADBgAATgYAAEwGAABIBgAArRMAAEMTAACCEgAAaxIAAPkSAABWEwAAiwkAABIGAABBBgAAOgYAAEUGAABkBgAAWwYAAEMTAAAQEwAADhMAAM0SAAB5EwAAMxMAAH4SAAB8CQAASQYAAHcGAAAcBgAAVAYAAGIGAABlEwAA3RIAAKoSAABoEwAAthIAANgSAADhEgAAsxIAAMsJAAAVBgAAIwYAAHEGAAApBgAAAhMAAB0TAACgEgAAjhIAADoTAACyEgAArxIAAGwSAAC1EgAAVgkAAGwGAAA+BgAATwYAAHATAABPEwAAvxIAAAsTAADTEgAA2RIAAB4TAABUEwAA8BIAALoSAAC0CQAAXgYAAEwGAABXEwAA0BIAABoTAAAAEwAABxMAAAcTAADSEgAAiBIAAO8SAAAfEwAAAxMAAJUJAAAZBgAA6hIAAAATAADvEgAABRMAAMkSAABpEwAAyxIAAGsSAAAFEwAAEBMAAGQSAADFEgAAXAkAAA==",
            "r": "1APeA94D3gPeA9QD1APUA8AD1AO2A8ADogPUA9QD3gPeA94DwANmA9oCCAJyATYBBAHSAN4D3gPeA94D1AOiAwIDoAAoAB4AFAAUAAoA3gPAAzQD1APUA5gDFgOCABQACgAKAAoAAADUA9oCbAIwAt4DrAOeAmQAFAAKAAAAAAAAAFgCKAAUABQAHgDeA4QD3AAeAAoAAAAAAAAAXgEKAAoACgAKAAoA1ANIA4IAFAAKAAAAAABkAAoAAAAAAAAAAAAKAN4DKgMyAAoAAAAAACgAAAAAAAAAAAAAAAAAAADUA5QCHgAKAAAAKAAAAAAAAAAAAAAAAAAAAAAAtgNoAQoAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAIQDKAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAwAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAngI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 539133,
            "raisePct": 25,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 24,
            "completeCells": 169,
            "minimumCellOpportunities": 1507
          },
          "HJ": {
            "n": "yAcAAOgEAAD8BAAAXwUAAAUFAADRBAAALwUAABIFAAD7BAAALQUAAOoEAADQBAAABQUAAEoPAABmBwAABgUAAP4EAADnBAAAxgQAANgEAADRBAAADwUAAK4EAACxBAAAowQAANMEAAAgDwAAjA8AAFQHAAAfBQAA/gQAAOoEAAC6BAAA3QQAAIgEAADuBAAA0wQAAMUEAABjBAAA7A4AAOgOAADBDgAARQcAAAMFAADnBAAArwQAAJkEAAC8BAAAugQAAKAEAAC0BAAA5wQAABEPAAC6DgAAsQ4AAJcOAAAkBwAA0gQAAJQEAACjBAAAxQQAAJ4EAADABAAAqgQAANMEAADfDgAAbg4AAKsOAABqDgAAVQ4AAPMGAADIBAAAzgQAANgEAACvBAAAyQQAALUEAACwBAAAUw4AAFsOAABNDgAAsQ4AAAYOAAAFDgAACAcAAMMEAACgBAAAsQQAAJ0EAACMBAAAoAQAAHkOAACUDgAAeg4AAEMOAADNDQAA8w0AANoNAAAYBwAAwAQAAIIEAAC+BAAAuAQAANAEAACaDgAAvw4AAFMOAAAJDgAAow4AAHoOAABLDgAAJg4AAA4HAACxBAAA3QQAAKoEAACWBAAAZw4AAHMOAABlDgAAVg4AAEYOAAATDgAAZg0AALoNAADuDQAAwgYAAIkEAADdBAAAkAQAABQPAADuDQAA+g0AAEYOAAARDgAANA4AANQNAADNDQAAqQ0AAJUNAAAMBwAAkwQAAJwEAADHDgAACA4AAMsNAABbDgAA5g0AABIOAAAUDgAAig0AAJMNAADdDQAA6A0AABAHAADEBAAAzQ4AABUOAABTDgAAXg4AALENAAANDgAADg4AAMUNAAABDgAADA4AAIwNAADSDQAA2QYAAA==",
            "r": "3gPeA9QD3gPeA94D3gPeA94D1APKA9QDwAPeA94D3gPoA9QDygOiA3ADAgOKAjoCEgLgAd4D3gPeA94D1APAA3ADMAKqAG4AUAAyADIA3gPUA7YD3gPUA7YDZgP+AWQAKAAeABQAFADeA4QDPgMWA9QDwAM+A6QBRgAKABQAAAAAAFIDSgFkAFoA8ADeA7YDHAJaABQACgAAAAAAsgI8AB4AHgAUACgA1AOOA5oBMgAKAAAAAADMARQACgAKAAoACgAUAN4DZgOWABQACgAAAKAACgAAAAAAAAAAAAoACgDUAxYDUAAUAAoAoAAKAAAAAAAAAAAAAAAAAAoAygP+ARQACgBaAAoAAAAAAAAAAAAAAAAAAAAAAMADRgAKAEYAAAAAAAAAAAAAAAAAAAAAAAAAAACOAxQARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgM=",
            "j": "AAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 404171,
            "raisePct": 29,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 29,
            "completeCells": 169,
            "minimumCellOpportunities": 1123
          },
          "CO": {
            "n": "sgUAAJEDAACOAwAAbgMAAOkDAAB0AwAAhAMAAG4DAABtAwAAawMAAJ0DAAB3AwAAdwMAACELAABPBQAAcAMAAI4DAACrAwAAigMAAJQDAACBAwAAkgMAAHEDAABxAwAAQgMAAFEDAAAQCwAA2woAAIYFAAByAwAAfwMAAFEDAACeAwAATgMAAIsDAABEAwAAKQMAAGkDAABHAwAAUQsAAM8KAABpCgAANgUAAFEDAACTAwAAfwMAAG0DAABaAwAAZgMAAF8DAABFAwAAdgMAAO0KAADGCgAAfAoAAOgJAAAlBQAAgwMAAHUDAABfAwAAQQMAAIYDAACOAwAANgMAAIMDAAC/CgAAPAoAAC4KAABqCgAAyAkAAAMFAAA7AwAARwMAAD4DAABRAwAATQMAAEkDAAAZAwAAzgoAADcKAABpCgAAawoAAHYKAAB0CgAA8wQAAGIDAABtAwAAcgMAAGwDAACFAwAAHwMAANsKAADtCQAAQAoAABwKAABgCgAANgoAAMoJAAAEBQAALQMAADIDAABJAwAAQQMAACYDAAC2CgAAXgoAAFMKAAAvCgAAzwkAAAcKAAD2CQAA+wkAABAFAAATAwAALwMAAAkDAABUAwAAuwoAAE8KAAAzCgAA0QkAAP8JAADjCQAAJQoAAOoJAACZCQAAyAQAAD8DAAA3AwAAKgMAAGkKAAB2CgAAtwkAADEKAAATCgAAHwoAADcKAACfCQAAjQkAAOIJAADuBAAAHAMAAFADAAC9CgAALwoAAOoJAABWCgAAMgoAAEYKAADeCQAAdwkAAOwJAABZCQAAggkAAKQEAAArAwAAgQoAAAcKAAAYCgAA7gkAAG0JAADeCQAA4QkAAIQJAADKCQAAkwkAAOQJAACbCQAA8QQAAA==",
            "r": "3gPeA94D3gPUA94D3gPeA94D3gPUA9QD3gPUA94D6APeA94D1APUA7YDjgNmA1IDSAMMA94D3gPeA94D3gPUA8ADegPQAoACMAIIAvQB3gPeA8oD3gPUA9QDrANIAzoCrgFoAb4AlgDeA8oDtgOiA9QD1AOOA/gC6gGgAEYAMgBGAMADDAOAAk4CWALeA9QDKgMIAowAPAAoAB4AogMcAq4BfAEsAYYB1APAA8YCQAFGACgAHgBmA2gBMgAyACgAMgCWAN4DrAMIAowAKAAUABYDZAAeABQACgAUAB4AWgDUA2YDaAFQAB4AKgMyAAoACgAKAAAACgAUADIAygPQAngAMgC8AigACgAAAAAAAAAKAAoACgAUAMoDDgEyAHYCHgAKAAoAAAAAAAAAAAAAAAAACgDAA1oAWAIeAAoAAAAAAAAAAAAAAAAAAAAAAAAAogM=",
            "j": "AAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 287483,
            "raisePct": 41,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 41,
            "completeCells": 169,
            "minimumCellOpportunities": 777
          },
          "BTN": {
            "n": "CwQAANMCAACNAgAAbAIAAF4CAAA/AgAAPwIAAFsCAABoAgAAYgIAAEkCAABdAgAASgIAAKEHAACfAwAAZAIAAFUCAABKAgAARwIAAGcCAAAGAgAANQIAAEUCAAAqAgAAJgIAAFgCAAAmBwAAygYAAKADAAAiAgAASQIAAEUCAAAwAgAAIQIAACsCAAAYAgAANAIAACoCAAAIAgAAPAcAACkHAADnBgAAiwMAAE8CAAAnAgAAPgIAABkCAAAnAgAAMgIAAGECAAAhAgAAKwIAAAQHAAApBwAA8AYAANIGAAAnAwAANQIAACUCAAAtAgAAKwIAABoCAAAWAgAALgIAAAMCAAAjBwAAmQYAAI8GAACnBgAAkwYAAB8DAAAMAgAAGAIAABQCAAA5AgAAAQIAAAoCAAACAgAAzwYAAKsGAADTBgAAYgYAAJ8GAACNBgAAMAMAAAUCAAAPAgAA6gEAABMCAAAYAgAA/wEAAPQGAACPBgAAmAYAAEsGAACwBgAAYQYAABcGAAD8AgAABQIAAPUBAAAPAgAA9wEAAA8CAADvBgAAWAYAAKAGAACiBgAACwYAACgGAAAfBgAAIwYAAAQDAAD3AQAAIgIAABkCAADnAQAA1wYAAJkGAACDBgAAbQYAAFoGAAB4BgAAbwYAAOIFAAA/BgAAKgMAACcCAADaAQAA0wEAANwGAAC/BgAArwYAAIcGAABXBgAAPwYAADEGAADWBQAAYQYAAAcGAADQAgAACwIAAAICAAAZBwAAbgYAAIsGAABEBgAARAYAACIGAABQBgAALAYAAPUFAADjBQAAAQYAAB0DAAACAgAAfQYAAF4GAABkBgAAcAYAABIGAAA5BgAADQYAADgGAADsBQAAvAUAANgFAABCBgAAIwMAAA==",
            "r": "3gPeA94D3gPeA94D1APoA94D1APUA94D3gPUA94D1APeA94D3gPeA9QDygO2A8ADogOsA94D3gPeA94D3gPeA9QDygOsA44DcANmA1wD3gPUA94D3gPeA94D3gO2A3ADSAMgAxYDIAPeA9QD1APKA9QD3gPeA6IDcAMCA7ICngJiAt4DrAOEA3ADegPUA9QDtgNmAwIDbAJsAv4B1ANwA0gDIAPaAhYD1APUA6IDIAPaAk4C9AHAAzQDngJsAjACOgLQAsoDygN6A9oCbAISArYD7gI6ArgBfAF8AdYBigLKA8oDNAOKAv4BwAOoAuAB5gCgAIwAvgBKARIC1AOiA7wCOgKiA4ACwgG+AGQAZABaAIIAyAByAcoDDAMSAqIDYgKGAaAARgA8AFAAPABkAG4AjADKAxwCjgNEAmgBlgBGADwAMgAyADIAMgBGAEYAtgM=",
            "j": "CgAKAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 183486,
            "raisePct": 65,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 65,
            "completeCells": 169,
            "minimumCellOpportunities": 467
          },
          "SB": {
            "n": "6AEAAEIBAAA1AQAAOgEAABMBAAA1AQAABQEAACsBAAASAQAACwEAACcBAAAjAQAAHwEAAH4DAACwAQAAIQEAADkBAAAMAQAABwEAABwBAAAkAQAAFAEAAP0AAAAEAQAAAAEAABQBAACrAwAALAMAAIcBAAArAQAAEQEAAAUBAADzAAAA9gAAAA4BAAAOAQAA+gAAAAUBAAD2AAAAfQMAACMDAAAnAwAArQEAAAIBAAALAQAA9wAAAAYBAAAEAQAA/wAAABEBAAD7AAAA4QAAAGcDAAA0AwAAUgMAADIDAACrAQAACQEAABwBAAD2AAAAEAEAABABAADxAAAABgEAAOcAAACCAwAAHgMAAA0DAAAnAwAAAQMAAHQBAAAQAQAAAAEAAAUBAAD2AAAAzwAAAAQBAAAKAQAAowMAAE8DAADgAgAA3wIAABYDAAD0AgAAkQEAAOYAAAD0AAAAAQEAAO8AAAD8AAAA7AAAAEoDAAAsAwAAMgMAAEADAAD/AgAAAgMAANACAABkAQAA7wAAAPQAAAD1AAAA+gAAAPMAAAApAwAAIQMAAPACAADoAgAA8AIAALMCAADyAgAAyQIAAH0BAADzAAAA7wAAAOQAAAD6AAAAYgMAAOACAAAMAwAA8QIAAO0CAADdAgAA7AIAAKgCAADDAgAANwEAAOUAAADjAAAA4wAAAFUDAAD/AgAA/QIAANQCAADkAgAA0gIAAMcCAADeAgAA7AIAALECAAB0AQAAywAAAN4AAABlAwAAEAMAAA8DAADxAgAA1wIAAN4CAADfAgAA3gIAAK0CAADOAgAAwgIAAFsBAAD3AAAADQMAAO4CAAD5AgAAHgMAAM4CAADSAgAA4QIAANgCAACgAgAAtwIAALECAADJAgAAWQEAAA==",
            "r": "cAOOA3oDUgOOA2YDSAM0AxYDFgMMAxYDIAOYA44DmAOOA2YDNAPkAtAC2gKyAsYCqAKeAqIDogNwA1IDNAPkAsYCdgJEAlgCJgLqARICogNmAzQDmAM0A+4CvAJsAv4BMAL+ARIC9AF6Az4DDAPaAoQDAgNYAjAC4AGkAdYBmgGkAVID7gJsAmwCOgJmA54CHAL+Af4BXgF8Aa4BNAOUAkQC/gHgAdYBXAO8AhwCwgGkAVQBuAE0A04C1gGkAXwBhgHCAQwDMAL0AdYBhgGaAQwDMAKkAXIBSgFKAUoBcgEMA2wChgGQAWgBDAMcApABaAE2ARgBVAFAAXIBngLqAcIBrgEMAxwCkAFoASwBBAEsAQ4BIgFeAYAChgF8AQIDMAKaAUoBIgH6APAADgEEAQQBGAGKApoB2gIcApABQAHmAOYA+gDIANIA5gD6APAAOgI=",
            "j": "AAAKAAoACgAKAAAAAAAUAAoACgAAAB4ACgAUAAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAAABQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "l": "bgBQAGQAeABGAHgAjACWAL4AyADSAKoAqgAyAFAAUABQAHgAoADwAA4B5gAiAfoAIgEsASgAPABaAIwAtADwABgBVAFyAV4BkAHCAZoBMgBuAKAAMgCqAPAADgFeAa4BfAGkAYYBkAFaAJYAvgD6AEYA3AByAZABwgHWAa4B9AGuAXgA0gAsATYBcgFaAEABuAGkAa4BHALgAXwBlgAYAUoBhgGkAbgBWgAsAaQBwgHqAeoBhgGWADYBfAGGAaQBuAHCAaAArgHCAbgB1gFoAbQALAGGAYYBhgGuAdYB9AG+AGgBOgLWAdYBqgA2AXwBVAFAAV4BaAGaAcwBNgHgAcwBzAG0ACwBcgEsASwBDgFKAUABkAG4ATYBJgLMAbQADgEsASIB8AAOAfoA3AAiAUABXgE2AcIByAA2ATYBDgH6AMgA0gDSAPAA5gAEAfAAhgE=",
            "opportunities": 85466,
            "raisePct": 55,
            "shovePct": 0,
            "limpPct": 28,
            "rfiPct": 55,
            "completeCells": 169,
            "minimumCellOpportunities": 203
          }
        },
        "20-30": {
          "EP": {
            "n": "1AMAAJUCAACIAgAAkAIAAHQCAADBAgAAngIAAJkCAAByAgAAmQIAAGYCAACJAgAAjAIAAKwHAADVAwAAlQIAAHgCAABuAgAAvQIAAHcCAACTAgAAPwIAAGoCAABlAgAAXQIAAJUCAADfBwAAwAcAAPoDAACTAgAAkQIAAIMCAAC3AgAASgIAAJICAACDAgAAkAIAAHMCAACGAgAAbAcAAIYHAACfBwAAwwMAAJMCAACZAgAAngIAAH4CAABiAgAAowIAAJoCAACYAgAAgwIAAMoHAABwBwAAlAcAAIgHAADzAwAAgwIAAIMCAAB7AgAAdgIAAIoCAACKAgAAbQIAAK0CAABcBwAAmAcAAJoHAAB6BwAAgQcAALUDAABrAgAAeQIAAIwCAAB7AgAAkgIAAIICAABwAgAAoAcAAIYHAABABwAA5AcAAJwHAABPBwAAvQMAAHICAACXAgAAfQIAAKECAAB0AgAAWwIAAL8HAACLBwAA7gcAAG8HAABVBwAADwcAAMAHAADOAwAAbgIAAGQCAABhAgAAsgIAAJACAABoBwAAcAcAAIoHAACdBwAAxwcAAHUHAAA6BwAAvwcAANADAAByAgAAugIAAJoCAAB8AgAAkgcAAGQHAACABwAAoQcAAF4HAACbBwAA2gcAANAHAACcBwAAxwMAAJoCAAB6AgAAtAIAAHkHAABvBwAAJwcAAJEHAACqBwAAcQcAAL4HAABwBwAAmQcAAEoHAACtAwAAkQIAAJ4CAABwBwAAhgcAAEkHAAAkBwAAmwcAAE8HAAA4BwAAzQcAAF8HAABtBwAAUAcAAMYDAACHAgAAfQcAAH0HAACUBwAAdQcAAJ0HAACCBwAAbgcAAJwHAACSBwAAlQcAAM4HAADEBwAAtgMAAA==",
            "r": "ygOiA6IDrAPKA6IDogNSAwIDSAPuAtACbAKYA8oDygPAA5gD0AK4AfoAZAAoACgAFAAKAKwDjgPKA6wDcAOAAiIBCgAKAAoACgAKAAoArAOyAg4BrANcAyYCDgEUAAAAAAAAAAAAAABwA7QAbgBaAI4DgALmAAoAAAAAAAoAAAAAAKAACgAKAAAACgCEA/QBKAAAAAAAAAAAAAAARgAKAAAAAAAAAAAAjgOkAR4AAAAAAAAAAAAeAAAAAAAAAAAAAAAAAIQDLAEKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABSA9IACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAsgI8AAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAOoBCgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAiAQoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAA=",
            "j": "AAA8ADIAKAAKAAoACgAKAAoAAAAAAAoACgA8AAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAACgACgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAKAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "FAAKAAoACgAAAAAAAAAAAAAACgAKAAAAAAAKAAoACgAKAAAACgAKAAAACgAKAAAAAAAKAAoAAAAAAAoAAAAKAAoAAAAAAAoAAAAAAAAACgAAAAAAFAAKAAoAAAAKAAoAAAAAAAoAAAAAAAAAAAAKAAAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 213413,
            "raisePct": 17,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 575
          },
          "MP": {
            "n": "MwMAACQCAAAFAgAAKwIAAA4CAAAnAgAA8gEAAPcBAADiAQAA2AEAAO0BAAAAAgAA1gEAAEcGAAAFAwAAAAIAAPsBAADRAQAA5wEAABMCAADzAQAACAIAAPoBAADZAQAAAQIAAOUBAABSBgAAMAYAACUDAAAOAgAAIAIAAOIBAADqAQAA9AEAAA0CAAD6AQAABgIAABgCAAAiAgAARwYAAPwFAAA7BgAAAwMAAOABAADZAQAA4AEAAPkBAAD5AQAA/QEAAOQBAAD+AQAA6AEAAEwGAAD1BQAADwYAAAoGAAAXAwAA8wEAAM0BAAAAAgAABgIAAN8BAADJAQAA9wEAAPUBAABiBgAA1wUAADAGAAD8BQAAFgYAADEDAAAbAgAACQIAAN4BAADeAQAAAwIAAPABAADOAQAAIQYAABgGAADYBQAACgYAAPIFAAAYBgAADQMAABkCAAAiAgAAxQEAAM0BAAD7AQAACAIAAAsGAADZBQAA8wUAAPcFAAAcBgAAvwUAAMoFAAAKAwAA4wEAAPIBAAAcAgAA7gEAABECAABBBgAA/QUAAEEGAAAKBgAAAwYAAAAGAADwBQAA5gUAAO8CAAAaAgAA3wEAAOEBAAD9AQAA+wUAAPUFAAADBgAAGQYAAOIFAAAbBgAA9QUAAMYFAAD0BQAA5AIAAPkBAAD0AQAA9wEAAO0FAAAjBgAAMAYAAPYFAAArBgAAFwYAAKQFAACzBQAA6QUAANIFAADXAgAA8QEAABMCAADQBQAAJAYAAOUFAADTBQAA5QUAAPkFAAABBgAAAAYAAIwFAADABQAABQYAANECAAABAgAA7wUAAAQGAADnBQAA/QUAAB8GAADzBQAA+wUAAKoFAAAHBgAAAQYAAOQFAAD3BQAA7QIAAA==",
            "r": "1AOOA7YDwAPKA6wDrAOiA1wDcAM0Az4D5AKOA8oDwAPKA6wDNAOUAqQB+gCWAIIAZABQAKIDtgPKA8ADjgPQAsIBUAAeAAoACgAAAAoAtgNSAyYCogOOA4oCuAEyAAoAAAAKAAAACgCYA8IBNgHwAKID+AJeATIACgAAAAoAAAAAAJABFAAKAAoACgCOA2ICRgAUAAAAAAAAAAAAyAAKAAoACgAAAAoAjgP+ATIACgAKAAAAAAA8AAAAAAAAAAAAAAAAAIQDfAEUAAoAAAAAAB4AAAAAAAAAAAAAAAAAAABmA0oBCgAAAAoAKAAAAAAAAAAAAAAAAAAAAAAA+AKCAAoAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAGICFAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAADCAQoAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANgE=",
            "j": "AAA8ACgAHgAKAAoAAAAAAAoAAAAAAAAACgBGAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAADwACgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "CgAKAAAAAAAKAAAACgAAAAAAAAAKAAAAAAAKAAoACgAAAAAACgAKAAAAAAAAAAoACgAAAAAAAAAAAAoACgAAAAAAAAAKAAoAAAAAAAAAAAAKAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 169015,
            "raisePct": 20,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 20,
            "completeCells": 169,
            "minimumCellOpportunities": 453
          },
          "HJ": {
            "n": "gAIAAJoBAAC4AQAArwEAALABAACkAQAAkwEAAIABAACrAQAAhgEAAGkBAAB/AQAAfwEAAA4FAAByAgAAmwEAAJEBAACJAQAAlAEAAIYBAACsAQAAfgEAAJoBAADPAQAAdwEAAIYBAADLBAAA3AQAAFUCAACBAQAAogEAAKMBAACGAQAAgQEAAIgBAACCAQAAiAEAAJ0BAACbAQAA2AQAAMQEAADtBAAAgwIAAFQBAACfAQAAjwEAAJwBAACAAQAAYgEAAK0BAACAAQAAqQEAAOIEAACdBAAAzQQAAKUEAABFAgAAigEAAJMBAACFAQAAkAEAAKYBAACjAQAAmgEAAGwBAAAFBQAAfQQAAMQEAAC3BAAAqgQAAE0CAAB5AQAApgEAAH8BAACbAQAAlgEAAHIBAAB2AQAA5gQAAJoEAACjBAAAwAQAAKIEAACdBAAATAIAAGwBAACDAQAAhgEAAIgBAAB5AQAAkQEAANkEAACbBAAApAQAAL4EAACSBAAAsgQAAMUEAABPAgAAlQEAAGcBAABzAQAAnAEAAIABAAAMBQAA6AQAAIYEAAB7BAAAqgQAAP4EAAC5BAAAmgQAAGsCAAB3AQAAhgEAAIMBAACAAQAAuAQAAKsEAAB/BAAArAQAAGEEAACjBAAAsAQAAIMEAABlBAAAWgIAAIQBAABdAQAAlgEAALIEAAChBAAAmAQAAJUEAAChBAAArQQAAHsEAAC6BAAA2AQAALUEAAApAgAAtAEAAIIBAACYBAAAgwQAAN8EAADCBAAAlwQAAKMEAABqBAAAjgQAAKwEAAB3BAAAlwQAAEkCAACDAQAA5AQAAJcEAACZBAAAjQQAAOcEAACxBAAAvQQAAG8EAACZBAAAegQAAGoEAACUBAAASQIAAA==",
            "r": "1AOiA6wDrAPAA8oDygPAA6IDwANwA3ADNAOYA8oDwAPUA8oDegMMA6gC9AGGASIBBAHwAKIDwAPUA9QDtgM+A4oCVAF4ADwAKAAoAAoAwAOiAyoDwAOsA1IDigLcADIAHgAKABQACgC2A9ACTgISApgDXAMSAuYAKAAKAAAAAAAKAOQCoAA8AB4AWgCOA+4CIgFQABQAAAAKAAoA6gEoABQAFAAKABQAjgOAAqoAHgAUAAAAAADwAAoAAAAAAAAAAAAKAI4DOgJaAAoACgAAAG4AAAAKAAAAAAAAAAAAAACEA6QBKAAKAAoAeAAKAAAAAAAAAAAAAAAAAAAANAPmABQACgA8AAAAAAAAAAAAAAAAAAAAAAAAAOQCHgAUADIAAAAAAAAAAAAAAAAAAAAAAAAAAACoAgoAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgI=",
            "j": "AAA8ADIAKAAeABQACgAKAAoAAAAAAAAACgA8AAoAFAAKAAoAAAAAAAAAAAAAAAAACgAAADwACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAHgAAAAoAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "CgAKAAAACgAAAAAAAAAAAAoAAAAKAAoACgAKAAoAAAAAAAAACgAAAAAAAAAAAAoAAAAAAAAACgAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAoAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 132060,
            "raisePct": 24,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 25,
            "completeCells": 169,
            "minimumCellOpportunities": 340
          },
          "CO": {
            "n": "FAIAAFABAAAhAQAAMAEAAFkBAABSAQAAJgEAAEABAAAzAQAAJAEAAEgBAABKAQAAKQEAABYEAADfAQAAXwEAACwBAAArAQAAPgEAACoBAAAtAQAALAEAACUBAAAVAQAALwEAAEUBAAAJBAAAtAMAAPMBAABUAQAASQEAAGoBAAAoAQAAQAEAAD8BAAA7AQAACwEAAEcBAAAyAQAA+AMAAOMDAADOAwAA4wEAADoBAABFAQAAKgEAABgBAAAjAQAACAEAADcBAAAVAQAAIwEAAL8DAACrAwAAuAMAAI4DAAABAgAAKQEAAEEBAAAiAQAAIwEAADwBAAA1AQAABwEAAE8BAACqAwAAjQMAAHoDAACFAwAAhQMAAK8BAAAsAQAALAEAACkBAAABAQAAIgEAABEBAAAXAQAAxAMAAIYDAABkAwAAjwMAAJkDAACVAwAAzQEAADoBAAAsAQAANwEAADUBAAA2AQAAKQEAAK4DAACEAwAApwMAALsDAAB3AwAAqgMAAGoDAACsAQAAKAEAAB4BAAAiAQAAGwEAAAkBAACtAwAAeAMAAHsDAACmAwAAlwMAAHQDAABsAwAAcAMAAMoBAAAiAQAAQgEAAC8BAAAuAQAArAMAAGgDAACSAwAAfgMAAGwDAABnAwAAYwMAAGoDAABoAwAAmQEAACABAAAaAQAAIgEAAKUDAACpAwAAkAMAAJADAADFAwAAYgMAAI0DAABgAwAAdQMAAIwDAAC+AQAAHQEAAA8BAAC2AwAAggMAAI8DAABrAwAAYwMAAF4DAAA+AwAAWwMAAHIDAACAAwAAFwMAALsBAAA5AQAAvAMAAKYDAACLAwAAkAMAAJsDAAC1AwAAlgMAAGADAABdAwAAWAMAAF8DAABkAwAApAEAAA==",
            "r": "1APAA8ADtgPAA7YDwAPAA6IDwAOsA6wDjgOOA9QDwAPKA8oDogOEA1IDDAOyApQCWAIwAqwDygPKA8oD1AOYA2YDbALgAa4BSgEYAfAArAO2A5gDmAPAA3oDPgNsAjYBvgCqAHgAUAC2A1wDIAMWA3oDmAPQAjACDgFQAB4AFAAeAIQDCAKGAUoBaAFcA3ADJgLmAEYAHgAUAB4AXANeAdIAtABuAL4AhAMgAwgCjAA8ABQACgDaArQAKAAoAB4ACgBGAHADFgNAAVAAFAAeAEQCRgAUAAoACgAKABQAKABmA3YCqgAoAB4ARAIoABQACgAAAAAACgAKAB4AXAOkAUYAHgD0AR4ACgAKAAAAAAAAAAAAFAAKADQDggAUAJoBFAAKAAAACgAAAAAACgAAAAoAAAACAxQAXgEeAAAAAAAAAAAAAAAAAAAAAAAAAAAAvAI=",
            "j": "CgAeAB4AKAAUACgAHgAUAB4AFAAUAAoAFABaABQAHgAUAAoACgAKAAoAAAAKAAAAAAAAADIAFAAUABQACgAAAAAAAAAAAAoAAAAAAAAAMgAUAAAARgAUAAoAAAAAAAAAAAAAAAAAAAAoAAoACgAAAFoAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAACCAAoAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAWgAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAGQAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABaAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAWgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAEYAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAA=",
            "l": "AAAAAAAAAAAKAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAoAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAACgAKAAAAAAAAAAAAAAAKAAAAAAAKAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAKAAAACgAAAAAACgAAAAAAAAAAAAAAAAAKAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 100545,
            "raisePct": 34,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 35,
            "completeCells": 169,
            "minimumCellOpportunities": 257
          },
          "BTN": {
            "n": "kgEAAPYAAAD8AAAA9AAAAOwAAADkAAAA9QAAAPUAAADaAAAA8AAAANkAAADdAAAA1AAAAOgCAAB3AQAA5AAAAP0AAADrAAAA3AAAANsAAADUAAAA4gAAAM0AAADmAAAA2wAAANMAAAD5AgAAsQIAAFUBAADZAAAA5QAAAAcBAADmAAAA4AAAAOUAAADkAAAA5AAAAMoAAADeAAAAwwIAAPQCAAC6AgAAUgEAAN4AAADWAAAA2wAAAOgAAADNAAAAzwAAANkAAADFAAAA2wAAAOYCAADkAgAAiQIAAKoCAABFAQAA9QAAAMUAAADqAAAA0wAAAN8AAADSAAAAvgAAANQAAAB7AgAAkAIAAOMCAACjAgAArgIAAEYBAAD2AAAA3QAAAM0AAADbAAAA3QAAAOQAAADdAAAABAMAALUCAACJAgAAlwIAAJwCAADPAgAAVQEAALkAAADXAAAA2wAAANAAAADPAAAAxAAAANACAACoAgAAkQIAAMgCAAB9AgAApAIAAI8CAAA9AQAAyAAAAM8AAADXAAAA4AAAAMQAAACmAgAAgQIAAIoCAACRAgAAjQIAAIQCAABMAgAAcAIAADkBAADVAAAA9wAAALsAAADLAAAA1wIAALACAAC4AgAAYAIAAIUCAABrAgAAkwIAAHUCAAAqAgAAJAEAANEAAADQAAAAuAAAAKACAACAAgAAlwIAAIACAACHAgAAXwIAAG8CAABbAgAAdAIAAIMCAAAuAQAAxwAAAMcAAACQAgAAkAIAAI0CAAB2AgAAfwIAAJACAABAAgAAjgIAAFgCAABvAgAAVgIAAD0BAAC9AAAA2QIAAH0CAABWAgAAgwIAAIgCAABZAgAAdgIAAGgCAAB7AgAAmAIAAE8CAAA8AgAANgEAAA==",
            "r": "1AOOA5gDogOYA44DogO2A5gDhAOsA6IDrAOYA9QDrAOiA9QDtgO2A6IDegNwA1IDXANSA44DogO2A7YDmAPAA5gDmANIA/gC0ALGAtoCjgOiA8ADogPKA8ADrAOOA8YClAJiAk4COgJmA6IDhANwA3oDtgOEA0gD7gImAq4BhgFoAYQDNAMMA9oC0AJcA6wDNAPuAjoCkAFAAUABegPkAqgCWAL0AUQCPgOYAyADWAKkAWgBVAFmA6gCzAGuAV4BaAEIAjQDegOUAvQBVAH6AFIDWAJyAfoAvgDcABgBmgFIAyoDWAK4AfAAZgP0AUABoABaAEYAWgC+AEoBDAPGAsIBaAE+A8wBDgF4ADIAPAA8AFAAZADSAAwDOgJUATQDmgHmAFoAMgAyADwAHgAeADwAWgAqA14B+AJeAcgARgAoADIAMgAUAB4AKAAyADIA5AI=",
            "j": "CgBQADwARgA8AFAAPAAyAEYAUAA8ADwAKABGAAoAKAA8AAoAHgAKAAoAAAAAAAoACgAKAFAAPAAoAB4APAAKABQAAAAAAAoAAAAKAAoAUAAyABQAPAAUAAoACgAAAAAACgAAAAAACgB4ABQACgAUAGQACgAAAAoAAAAAAAAACgAAAEYAFAAKAAoAAACCAAAACgAKAAAAAAAAAAAARgAUAAAAAAAAAAAAoAAKAAAACgAAAAAAAAA8AAAAAAAAAAAAAAAAALQACgAAAAAAAAAAADIACgAAAAAAAAAAAAoAAACWAAAACgAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAoAAoAAAAAAAAAAAAAAAAAAAAAAKAACgAKAB4AAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAHgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAggA=",
            "l": "AAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAACgAAAAoACgAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAoAAAAKAAAACgAKAAAAAAAKAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAKAAAAAAAAAAAACgAAAAAACgAKAAAACgAAAAAAAAAKAAAAAAAAAAoACgAAAAAACgAAABQAAAAAAAAAAAAAAAoAAAAAAAoAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAACgAKAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAACgAAABQACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 72649,
            "raisePct": 53,
            "shovePct": 2,
            "limpPct": 0,
            "rfiPct": 55,
            "completeCells": 169,
            "minimumCellOpportunities": 184
          },
          "SB": {
            "n": "8AAAAIgAAACHAAAAkgAAAIsAAACGAAAApwAAAI0AAACUAAAAgAAAAHwAAACFAAAAiAAAANUBAADdAAAAgAAAAIMAAAB8AAAAhgAAAIAAAABuAAAAhAAAAH8AAACVAAAAbwAAAHoAAADPAQAAoQEAANMAAAB+AAAAewAAAIwAAACBAAAAggAAAHsAAAB7AAAAeAAAAHgAAACNAAAAsgEAAJ8BAAB4AQAAvgAAAI0AAAByAAAAhwAAAHAAAACGAAAAcwAAAG0AAAB1AAAAewAAALgBAACpAQAAmwEAAHQBAADVAAAAigAAAIEAAABzAAAAdQAAAHoAAACUAAAAdwAAAIIAAACfAQAArwEAAI4BAAB5AQAAgwEAAMoAAAB/AAAAcgAAAG0AAAB2AAAAcgAAAHoAAABvAAAApgEAAK4BAACVAQAAdQEAAKABAACNAQAAuQAAAI8AAABqAAAAewAAAIQAAACHAAAAbAAAAM4BAACxAQAAdwEAAFkBAAB0AQAAhgEAAG8BAACkAAAAfQAAAI8AAABbAAAAdwAAAHgAAACuAQAAqgEAAGEBAACGAQAAbAEAAGMBAAB0AQAAYwEAAKoAAAB+AAAAawAAAHgAAACOAAAAfgEAAIUBAACFAQAAhQEAAGkBAACIAQAAYwEAAG0BAABiAQAAswAAAIYAAAB+AAAAcgAAAIcBAACBAQAAewEAAHUBAABoAQAAdwEAAG8BAABFAQAAWAEAAGIBAAC4AAAAXQAAAH0AAACHAQAAhQEAAFUBAABrAQAAVAEAAIoBAAB+AQAATAEAAGcBAABQAQAAXQEAAKEAAABxAAAAkQEAAJUBAABfAQAAbAEAAGoBAABSAQAATAEAAFUBAABOAQAAagEAAGwBAABXAQAAoQAAAA==",
            "r": "PgPGAsYC5AL4ApQCbAImAnYCRAIcAhICWALkAkgDKgP4ArwCqAJiAjACJgLgAeABCALMAdAC7gJSA4ACngIcAiYCwgFyAbgBrgHCAV4BqAK8AoACNAMSAjACzAEcArgBcgFyAXIBNgGKAmwCdgISAtoCMAKQAYYBhgEsAZABQAFAAU4CJgLgAdYBfAGKAmICrgGQASwBNgFUAfAAOgIcApoBkAFAAYYBOgJoAV4BNgHwACIBtABEAvQBVAE2ATYBSgFUAa4BpAFeAUABIgFAASYC4AE2AUABDgEEARgBGAG4AZAB+gAOARgBTgLgAWgBDgHmANwA+gDcAEABhgF8ATYBSgE6AswBNgH6AKAAvgC+ALQAqgC+ACIBQAH6ADACpAFUASwBvgDmAPoA8ADSANwA0gBAAUAB9AGaARgBDgHcALQAyACgANIAqgDIALQAGAE=",
            "j": "CgBaAIIAqgB4AKAAlgC+AJYAvgB4AL4AggCMAAAAMgBuADwARgA8ADwAKAA8ADIAFABGAKAAZAAeADwARgBkACgAFAAeAAoAHgAUAB4AqgBaAFAAPACCAB4APAAKAAAAFAAAAAoACgDIAFAAMgAoAIwAKAAyAAoAAAAAAAoACgAAAPAAPAAUAAoAFAD6AB4AHgAAAAAAAAAAAAAA5gAeAAoAFAAAABQABAEUABQAFAAKAAoAAADIACgACgAKAAAAAAAAAF4BHgAKAAoAAAAKAKAAHgAUAAoACgAKAAoACgA2ARQAAAAAAAAAlgAUAAAAAAAKAAAAAAAAAAAASgEKAAAACgCgABQAAAAKAAAAAAAAAAAAAAAAAFQBCgAKAJYAHgAAAAAACgAAAAAAAAAAAAAAAAB8AQAAoAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAE=",
            "l": "jAC+AJYAUAB4AKAA0gD6AMgA3ABKAQQBBAFuAJYAggCCAOYA+gA2AWgBSgGaAa4BmgGQAW4AlgBuACwB8ABoAWgBCAI6ApoB1gGaAf4BggC0AAQBZABUAXwBuAGQAcwB9AH0AdYBEgKCAA4BGAF8AYIAkAESAhICHAIIArgB/gEmAqAANgGaAa4B/gFaAF4BCAISAuoBCALCAa4BqgBeAdYBwgH0AeoBqgBiAjoCMAImAswBHAK+AEoBuAGaAeAB4AEcAsgAEgJ2AhICEgJeAfoAXgGaAXwBaAHCAbgBJgLwADACdgIcAuoB3ABUAV4BSgE2ASIBXgHCAdYBDgFEAggCuAHIAEoBaAEiAfoA5gDwAEABXgHWAV4BMAIIAuYALAFAASIB5gC0AMgAvgDcABgBLAEiASYCDgFAAUoBBAGqAL4AqgCqAL4A3AC+ANIApAE=",
            "opportunities": 42061,
            "raisePct": 42,
            "shovePct": 5,
            "limpPct": 32,
            "rfiPct": 47,
            "completeCells": 169,
            "minimumCellOpportunities": 91
          }
        },
        "15-20": {
          "EP": {
            "n": "vgEAADwBAABBAQAAMAEAACMBAAA9AQAAIwEAAF8BAAAfAQAASwEAAEgBAAArAQAALAEAAM4DAAD4AQAAFAEAABsBAAAqAQAAJgEAAEEBAABHAQAANAEAAEsBAAAtAQAANQEAAFEBAACTAwAAFwQAANQBAABXAQAARgEAAC4BAABeAQAAJAEAAEQBAAAoAQAAOAEAAB0BAAA8AQAAsQMAANIDAABqAwAA+AEAAB0BAAAzAQAAMgEAAEMBAABMAQAAVAEAAEsBAAAvAQAAMQEAAIkDAACsAwAAlQMAAGUDAADgAQAAJgEAADIBAAAmAQAAUAEAAEEBAAA9AQAAKwEAADYBAADVAwAAqgMAAI8DAACUAwAAzQMAALQBAABZAQAASQEAAEIBAAAxAQAAJgEAADABAAAvAQAAygMAAKQDAADRAwAAowMAAJgDAADHAwAA2gEAAEQBAAAyAQAAYAEAAEsBAAA+AQAALgEAAFoDAAB5AwAA4QMAAJ4DAACfAwAAsAMAAKoDAAD5AQAAIQEAAEEBAAAjAQAAHAEAAEIBAADbAwAA7gMAAJ0DAACrAwAA4wMAAKYDAAC0AwAAsAMAAMIBAAA5AQAAIwEAAB4BAAA/AQAAmgMAAKkDAAC3AwAAhgMAAHoDAABcAwAAlwMAALIDAADMAwAA0gEAAB0BAABHAQAAIAEAAGYDAADrAwAAsQMAAIoDAACuAwAAnQMAALMDAADgAwAAsgMAALkDAADkAQAAVQEAAD8BAACQAwAATAMAAKADAACgAwAAmwMAANMDAAC0AwAAdgMAAKQDAADBAwAAAwQAANABAABAAQAAmgMAAP0DAAC7AwAAxQMAAJsDAADNAwAAlwMAAMwDAADBAwAAqAMAALoDAADqAwAA0wEAAA==",
            "r": "hAOoAsYC5ALGAuQC0AJEAhICRAI6AsIBrgGUAmYDFgNSA+4CwgHmAG4AKAAKAAAAFAAKAHYC+AIgA/gCYgI2AYIACgAAAAAAAAAAAAAA2gLMAYIAxgKoAkABggAAAAAAAAAAAAAAAACKAloAKAAoAIAChgE8AAoAAAAAAAAAAAAAAFoACgAAAAAAAAAmAvAAFAAKAAAAAAAAAAAAKAAAAAAAAAAAAAAATgK+AAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAAADoCjAAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAASAlAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAaAEUAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAALQACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABuAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAA=",
            "j": "PAAsAQQB+gD6AHgAPAA8AB4APAAKABQAHgBAAVAAqgBQADIACgAAAAoAAAAAAAAAAAAAAF4BRgCqADIAKAAAAAAAAAAAAAAAAAAAAAAA8AAUAAoABAEUAAoAAAAAAAAAAAAAAAAAAABuAAAAAAAAAEoBCgAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAACaAQoAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAaAEAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAACIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "l": "HgAKAAoACgAKAAAACgAKAAoACgAUAAAACgAKABQACgAKAAoAFAAKAAoAAAAAAAAAAAAKAAoACgAKAAoAFAAKAAoACgAAAAAAAAAAAAAAAAAKAAAACgAUAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAKABQACgAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAUAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAHgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 103887,
            "raisePct": 12,
            "shovePct": 3,
            "limpPct": 0,
            "rfiPct": 14,
            "completeCells": 169,
            "minimumCellOpportunities": 276
          },
          "MP": {
            "n": "gQEAABkBAAAbAQAAAQEAAAoBAAD8AAAAAQEAAOMAAAACAQAA+gAAAPUAAAD6AAAABwEAABADAACaAQAADAEAAPUAAAD0AAAA8gAAAPYAAADWAAAAEAEAAO8AAADtAAAA6QAAAPkAAADAAgAA6gIAAIIBAADqAAAA9QAAAPQAAADzAAAA+QAAAPAAAAAZAQAA9AAAAPkAAADiAAAA9wIAAPMCAADfAgAAZwEAAPQAAAD9AAAA7AAAAPMAAADaAAAA4QAAAOUAAAABAQAA/wAAAPMCAAADAwAA6QIAAN8CAABsAQAABAEAAAgBAAD7AAAA+QAAAAEBAADxAAAA7gAAAAgBAADwAgAAywIAAKUCAADEAgAA+gIAAHEBAADiAAAA+gAAABMBAAAJAQAA4gAAANwAAAD4AAAADQMAAMcCAADcAgAA3QIAAMACAADCAgAAcAEAAOUAAADXAAAA5AAAAPEAAADoAAAAAAEAALACAAACAwAA/wIAAMoCAAAEAwAA5QIAANACAABeAQAA7wAAAOEAAADpAAAA6wAAAPAAAADvAgAA1wIAALwCAADRAgAA4AIAALICAACeAgAA2AIAAGMBAAD9AAAA9AAAAPEAAADtAAAA7AIAAOwCAAD3AgAA3QIAAM8CAAD0AgAAxAIAAAoDAAC6AgAATgEAAPkAAAAIAQAACQEAAOACAAC3AgAA4AIAANoCAAD0AgAA7wIAANICAADaAgAA5gIAAOMCAABGAQAA8wAAAOYAAADXAgAAIQMAANICAADAAgAA7wIAAMECAAAMAwAAzwIAANQCAADCAgAAxwIAAG8BAADpAAAAwwIAAKUCAAAAAwAA7wIAABADAADfAgAA6QIAAM0CAADYAgAA0gIAAL4CAADMAgAAegEAAA==",
            "r": "mAPGAsYC7gIMAyoDxgKAAnYCvAJYAjoC/gGUAnADNANSAyADMAJ8AdwAeAAeADIAHgAoAIoCFgNSAz4DvAKkAdwAMgAAAAoACgAAAAAA0AI6AiIBxgLkAoYBvgAUAAoAAAAAAAAAAACoAtwAlgBkAHYC/gGqABQACgAAAAAAAAAAAL4ACgAKAAoACgA6AkABMgAKAAAAAAAKAAAAZAAKAAAAAAAAAAAATgLcAB4AAAAKAAAAAAAoAAoAAAAAAAAAAAAAAAgCtAAKAAAAAAAAABQAAAAAAAAAAAAAAAAACgD0AYwACgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAA1gEyAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAF4BAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAADcAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlgA=",
            "j": "KAAOAQ4B5gC+AIIAeABaADwAKAA8ACgAHgBAAVoAqgBkADIAKAAKAAoACgAKAAAAAAAAAEoBeACCADwAFAAKAAoAAAAAAAAAAAAAAAAABAEyAAoADgEoABQAAAAAAAAAAAAAAAAAAACqAAoAAAAKAF4BHgAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAACaAQoACgAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAhgEUAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAIYBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAQAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgA=",
            "l": "FAAAAAoAAAAUAAoACgAeABQACgAKAAoAFAAKABQAAAAeAAoACgAUAAAAAAAKAAoAAAAKAAAACgAKABQACgAUAAoAAAAAAAAAAAAAAAAAAAAKAAoACgAUAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAoAFAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 81061,
            "raisePct": 14,
            "shovePct": 3,
            "limpPct": 0,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 214
          },
          "HJ": {
            "n": "RAEAANQAAADKAAAAtwAAAMUAAADRAAAA2wAAALwAAAC+AAAAtgAAALgAAADFAAAAugAAAFUCAAAjAQAAwgAAAL8AAADeAAAAvwAAALEAAACfAAAAxgAAALoAAADAAAAAtgAAAKgAAABUAgAAXwIAACUBAAC9AAAAyAAAAKYAAADKAAAAqAAAALAAAADdAAAAtwAAALcAAADZAAAAagIAAFICAAAVAgAARAEAALUAAACwAAAAugAAALUAAACzAAAArAAAAL4AAAC7AAAAsgAAAEACAAAXAgAAIAIAAC4CAAAJAQAAyQAAAOAAAADFAAAAzAAAAKwAAADQAAAAsgAAAJ0AAABJAgAAPgIAAEICAAA0AgAAWgIAACoBAACuAAAAtQAAALoAAADDAAAAqQAAAMgAAACmAAAAQwIAADYCAAAdAgAAKgIAAE0CAABbAgAAGAEAAMIAAAC9AAAAuQAAAMEAAACvAAAArwAAAFQCAABCAgAALQIAAD8CAAAhAgAASAIAACUCAAAGAQAAuwAAALMAAACrAAAAtwAAAM0AAAA5AgAANQIAAEACAAA0AgAAGQIAAE4CAAAZAgAAJwIAAB0BAADIAAAAqwAAAKsAAACWAAAAMQIAACwCAABGAgAAOwIAACUCAAA4AgAALwIAAEoCAAAEAgAAKQEAAMAAAACoAAAAswAAAEYCAABeAgAAKAIAADICAABBAgAAOAIAADgCAAA6AgAAKwIAACQCAAASAQAAvgAAALEAAAAzAgAASAIAAB4CAABBAgAAMAIAABACAAAIAgAAHgIAADwCAAA+AgAACgIAAA8BAACoAAAAFwIAACUCAAAnAgAAJAIAADICAAAwAgAA/wEAAPoBAAAPAgAAJAIAAB8CAAAMAgAADQEAAA==",
            "r": "rAOyAuQC+AL4AuQCDAOUAoAC7gKAAoACbAJ2Ao4DFgM0A0gDlAIIAjYB8ACMAKoAUACCAE4CIAM0A1IDNAPqAXIBbgAyAAoACgAKAAoAngLGAhIC7gIgA/QBLAGCACgACgAKAAAACgDGAtYBLAEOAYACTgLmAFAACgAKAAoAAAAKAMIBRgAUABQAFABOAuABUAAUAAoAAAAKAAAADgEeAAoACgAAAAoAHAJ8AVAAAAAAAAoAAACMAAoAAAAAAAAAAAAKABICGAEUAAoAAAAAAEYAAAAAAAAAAAAAAAAAAABOAuYAHgAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAEgJQABQAAAAoAAoAAAAAAAAAAAAAAAAAAAAAAHwBFAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAQoAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+gA=",
            "j": "KAAYAdwA5gDSAL4AlgC0AKAARgA8ADwAKABoAUYAyACMADwAHgAeAAAAAAAKAAoACgAAAJABlgCWAFoARgAoAAoACgAAAAAACgAAAAAALAFGAB4A8AAyABQACgAKAAAAAAAAAAAAAADSABQACgAKAGgBFAAKAAAAAAAAAAAAAAAAAFoAAAAKAAAAAACQARQAAAAAAAAACgAAAAAARgAAAAAAAAAAAAAArgEUAAAACgAAAAAAAAAoAAAAAAAAAAAAAAAAAJoBCgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAA2AQAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAA5gAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAANIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAA=",
            "l": "CgAKABQACgAKAAoACgAKAAoAAAAAAB4ACgAAAAoACgAKAAoACgAAAAAACgAAAAAAAAAKAAAAAAAKABQAAAAKAAoAFAAAAAAAAAAKAAAACgAKAAoAAAAAAAoACgAKAAoAAAAKAAAAAAAAAAAACgAAAAAAFAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAUAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAoAAAAAAAoACgAAAAoAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAACgAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "opportunities": 62141,
            "raisePct": 17,
            "shovePct": 4,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 150
          },
          "CO": {
            "n": "/gAAAJEAAACkAAAAngAAAJEAAACZAAAAmQAAAJkAAACRAAAAhgAAAJ8AAACLAAAAlAAAAPwBAAACAQAArAAAAKUAAACSAAAAkAAAAI0AAAB6AAAAowAAAIUAAAClAAAAgwAAAIAAAADSAQAAogEAAPUAAACMAAAAngAAAJgAAACDAAAAhwAAAI8AAACyAAAAkwAAAJcAAACLAAAApQEAAMsBAACqAQAA0wAAAIQAAACQAAAAmQAAAJwAAACLAAAAggAAAKoAAACPAAAAiAAAANkBAAC3AQAAtQEAALgBAADhAAAAkgAAAIoAAACJAAAAlAAAAJEAAACUAAAAmwAAAIEAAADNAQAAywEAAIIBAADEAQAAwQEAAOsAAACFAAAAlwAAAI4AAACCAAAAggAAAIIAAACGAAAA1AEAAJEBAACrAQAAugEAAJcBAAClAQAA0gAAAIoAAAB/AAAAgwAAAI0AAACNAAAAigAAALwBAAC+AQAAuwEAAKkBAADPAQAAnAEAAL0BAADXAAAAjwAAAIwAAACEAAAAnQAAAI0AAADWAQAA2wEAAMMBAADHAQAAnAEAALgBAAC5AQAAqAEAAOYAAACLAAAAkwAAAH8AAACbAAAAyQEAAKUBAACvAQAAtAEAALcBAACZAQAArQEAAJEBAADOAQAA0gAAAJgAAACCAAAAcAAAAPABAACiAQAAmwEAALQBAACqAQAAkgEAAJcBAACbAQAAjgEAALEBAADJAAAAkAAAAIwAAADSAQAAowEAAJYBAACqAQAAlwEAAI4BAACsAQAAhwEAAKgBAACYAQAAlAEAAMYAAACMAAAAwAEAAMkBAACUAQAAqAEAALUBAAC2AQAAbAEAAJEBAAB0AQAArAEAAL8BAACTAQAAtgAAAA==",
            "r": "tgPuAtACqAKyAgwD2gLuAhYD0AICA/gC7gKAAnoDsgICAxYD5AKeAv4BwgF8Aa4BkAFAAZ4CDANIA+QCAgP4AnYCkAH6AL4AlgBuAFAAdgLaAqgC2gIMA6gC9AGaAZYAggA8ADIARgCUAmwCOgLqAVgCqAKkAQQBRgAoABQAAAAKAHYCSgHSAIwAvgAIAqgCQAGCADIACgAUAAoAOgKMAIwAUAA8AEYArgESAiwBHgAUAAoAAAC4AVAAFAAeABQACgAUABwC6gF4AB4AFAAUAEoBHgAUAAoAAAAKAAoAKACuAaQBMgAKAAoASgEKAAoAAAAKAAAACgAAABQA/gEiARQACgD6AB4ACgAKAAAAAAAAAAAAAAAKALgBMgAeANwACgAKAAoAAAAAAAoAAAAAAAAACgCaAQoAyAAUAAAAAAAAAAAACgAAAAAAAAAAAAAArgE=",
            "j": "KADmAA4BLAEsAbQA5gCqAIwAtAB4AG4ARgBeAVoAIgG+AHgAUAAyAAoAKAAeACgAFAAAAEABtACWAL4AeAAyABQACgAeAAoACgAKAAAAXgGMADwABAFuAB4AFAAKAAoAAAAAAAoAAABAASgAMgAKAHwBRgAKAAoAAAAAAAAAAAAKANIACgAKAAoAAADCARQACgAKAAAAAAAAAAAAtAAAAAAAAAAAAAAAJgIeAAAACgAAAAAAAABkAAoAAAAAAAAAAAAAAJABAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAADqAR4ACgAAAAAARgAAAAAAAAAAAAAAAAAAAAAAhgEAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAEoBAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAQAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgA=",
            "l": "CgAAAAAAAAAKABQAAAAKAAAAFAAAAAoACgAAAAAACgAAAAoAFAAAAAoAAAAAAB4ACgAAAAAAAAAKAAoACgAAAAoACgAAAAAAAAAKAAoAAAAKAAoACgAKAAoAFAAAAAAAAAAKAAAAAAAAAAoAAAAKAAoACgAAAAoAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAoAAAAAAAoAAAAAAAoAAAAAAAAAAAAAAAAACgAAAAoAAAAKAAAAAAAKAAAAAAAAAAAAAAAKAAoAAAAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAKAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 47697,
            "raisePct": 23,
            "shovePct": 6,
            "limpPct": 0,
            "rfiPct": 28,
            "completeCells": 169,
            "minimumCellOpportunities": 112
          },
          "BTN": {
            "n": "1gAAAI0AAABtAAAAbgAAAIcAAAB0AAAAjAAAAH4AAABsAAAAaQAAAIMAAAB+AAAAdgAAAIMBAACgAAAAhAAAAGoAAABzAAAAdwAAAHgAAABmAAAAbQAAAHcAAABoAAAAggAAAG8AAACTAQAAXAEAAKkAAAB+AAAAbgAAAGQAAABxAAAAbQAAAHUAAABvAAAAZwAAAFoAAAB3AAAAfQEAAHIBAAA5AQAApAAAAGgAAABxAAAAZQAAAHAAAAB4AAAAfgAAAGoAAABzAAAAaAAAAJcBAABvAQAASwEAAFABAADCAAAAbAAAAHIAAABqAAAAdwAAAGUAAABxAAAAcgAAAGwAAAB0AQAAWAEAAFsBAABgAQAAYgEAAKcAAABsAAAAdAAAAHMAAAB8AAAAfwAAAG0AAAB0AAAAdgEAAC4BAAA4AQAAUQEAAGYBAABLAQAAngAAAGYAAABjAAAAaAAAAGIAAAB2AAAAbwAAAEQBAABQAQAAWQEAAFMBAAA1AQAAXQEAADkBAACzAAAAZQAAAF4AAABRAAAAbwAAAG4AAAByAQAAbQEAAF4BAABPAQAATAEAAFcBAAAyAQAAOQEAAJ8AAABtAAAAWQAAAF8AAABkAAAAUgEAAEYBAABAAQAARwEAAGUBAABTAQAAIwEAADwBAAA5AQAAmQAAAFsAAABrAAAAYgAAAHgBAABQAQAANQEAAEMBAAA7AQAAPQEAAE4BAABJAQAAUwEAAE8BAACSAAAAZAAAAGcAAABPAQAAWgEAADIBAABPAQAAOwEAABoBAAA6AQAAKwEAABABAABUAQAAPQEAAIoAAACAAAAAVgEAAEkBAABLAQAAWgEAACkBAAA0AQAASQEAAEoBAAAqAQAALgEAACkBAAAnAQAAjgAAAA==",
            "r": "tgM0A6gCYgKAArICOgJ2AmwCqAJsAsYCdgKoAqIDsgLaAvgCxgJ2AqgCngKyAooCOgJsAmwCsgI+A+QC+AICA8YCdgJsAoACCAL+AdYBWALQAtoCFgMMAxYDdgJ2AuoB1gHCAVQBGAE6ArwCsgLGAoACPgOAAk4C1gEiAUoBqgC0ABwCbAIwAhwCwgH0AagCTgK4AUoB8ABuAL4ARAL+AeoBuAFUAZAB6gHGAhICSgHmAL4AjAAwAuABNgH6AL4AvgD6APQBdgKGAQQB3ACMADAChgEEAYIAbgCgAL4A+gCkATACQAHwANIAMAI2AbQAUAAyADIAPABQAKoAaAGkASIBggASAvAAjABQACgAMgAyACgAKACMADYBXgG+AE4C+gCgADwAHgAKAB4AFAAeAEYAPABeAYwA9AHIAIIAMgAeAAoAFAAKAAoAFAAeABQAhgE=",
            "j": "KACqACwBhgFUATYBmgFeAUABDgFKAdwAQAE2ATwANgEEAdwA0gAYAbQAoABGAHgAUABGAHwBLAGMANIA5gB4AGQARgAeABQACgAKAAAAfAEEAaAAvgCgAG4AeAAeABQAHgAKAAoAAACkAdwAZABQAGgBUAA8ADIACgAUAB4AAAAKAK4BWgAeAB4AFADqAXgAFAAeAAAAFAAKABQAXgEyABQAFAAKABQA4AFGAAoAAAAAAAoAAABKATIAHgAUABQACgAKAOABMgAKAAAACgAUABgBHgAAAAAACgAKAAoAAAAmAigAAAAKAAAA8AAoAAoACgAAAAAAAAAAAAAAHAIUAAoAAADcABQACgAAAAAAAAAAAAAAAAAAADoCCgAAALQACgAKAAAAAAAAAAAACgAAAAAAAADMARQAyAAUAAAAAAAAAAAAAAAKAAAACgAAAAAArgE=",
            "l": "CgAAAAAAAAAKAAAAAAAAAAoACgAAAAoAAAAKAAoAAAAAAAAACgAAABQACgAKAAAACgAAAAAACgAKABQAAAAUABQAFAAAAAAAAAAKAAAAAAAKAAoACgAAAAoAKAAoAAoAAAAAABQAAAAAAAAACgAKAAAACgAUAAAAAAAKAAAACgAAAAAACgAKAAoAAAAKAAoAHgAUAAoAFAAAAAAAAAAAAAAACgAKAAoACgAKABQACgAAABQAAAAAAAoAAAAAAAAAAAAKAAoACgAAAAoAAAAAAAoAAAAAAAoAAAAAAAAAAAAAAB4ACgAAAAoACgAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAKAAAAAAAAAAoAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAUAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 36781,
            "raisePct": 36,
            "shovePct": 10,
            "limpPct": 0,
            "rfiPct": 46,
            "completeCells": 169,
            "minimumCellOpportunities": 81
          },
          "SB": {
            "n": "oAAAAFAAAABjAAAAWgAAAFAAAABfAAAAVQAAAFYAAABXAAAAUwAAAGAAAABRAAAAXwAAAB0BAACKAAAATQAAAF4AAABKAAAAPAAAAFAAAABJAAAATgAAAFcAAABQAAAARwAAAFMAAAAEAQAADwEAAHQAAABQAAAAVgAAAE4AAABRAAAAUgAAAFoAAABfAAAASAAAAE4AAABQAAAABgEAAN8AAAD/AAAAdQAAAE4AAABFAAAARgAAAEoAAABOAAAATwAAAGkAAABMAAAAVgAAAB0BAAD8AAAACwEAAAkBAACHAAAATAAAAEAAAABWAAAASgAAAEkAAABGAAAAQwAAAEMAAAApAQAA+wAAAP8AAADpAAAAEwEAAHgAAABJAAAATQAAAEIAAABPAAAATwAAAE4AAABDAAAAFgEAABABAADtAAAA9wAAAPAAAADsAAAAcQAAAEkAAABLAAAATgAAAEkAAAA9AAAASwAAAA0BAADpAAAADgEAAOYAAADcAAAA2gAAANUAAAB6AAAASAAAAEoAAAA7AAAARQAAAEAAAADpAAAABwEAAPQAAAD2AAAA4AAAAN0AAADbAAAA5gAAAG8AAABCAAAAUAAAAEIAAABEAAAA2wAAANYAAADmAAAA0gAAAPsAAADSAAAA2wAAAOAAAADYAAAAdAAAAEMAAABEAAAAPgAAAAUBAADpAAAA3AAAAPkAAADiAAAA5wAAAOgAAADSAAAA+QAAAN4AAABbAAAAQwAAADcAAAAHAQAA6AAAAOIAAADqAAAA8AAAANYAAADqAAAA8QAAAMoAAADZAAAA2gAAAHMAAABJAAAA6AAAAOEAAADJAAAA4QAAANcAAADcAAAAywAAANIAAADaAAAA2AAAALMAAADFAAAAagAAAA==",
            "r": "xgLWAf4BrgG4AUABGAH6AAQB+gA2AQQBIgHWAVgCCAKkAXIBwgEsAfoAIgFKAQ4BVAEsAfQBkAGoAl4BSgFyAXIBSgHwADYBGAHwAPoAaAFUAXwBbAKaASIBuAHwANIABAHmAPAA3ABKAYYBQAFKAfQBQAG4ARgB8AC0AIwAoADIACIBaAEiAQ4BLAFKAUABDgHmAPoAtADcAPoA8AAiAUABDgHmAPoANgFUAUoB0gC+ABgBBAEEASwB3AAiAdIA8ADcAPoABAHcAPAA3AC+ACwBNgHSAAQByAD6ANIAqgD6ANIABAEOAfoA5gAYAQ4B5gCqAL4AvgCWAKAAjAAOAdwABAEYAQQB3ACWAKAAggB4AL4AggC0AG4A8ADmAAQB+gDmAJYAtACWAIwAqgCgAIwAoADSAKoA8AAOAdIAqgCqAIIAlgCMAIIAeAB4AIwAvgA=",
            "j": "HgBUASwBzAHCATACYgJsAlgCWAL+Af4BHAKaAVAArgGGAcwBLAF8AaQBaAEiAQQB0gDcAJAB6gFkAK4BVAFeAdwA8AAOAdwAoABGAIwAEgL+AV4ByABoAbgBqgAEAWQAUAA8ACgAjABOApoBLAEEAXwBIgGMAFAAjABaADwAFAA8AGwCQAHmAG4AZAA6AtwAUAAeADIAKAAKAB4AigIsAaAAbgAyAG4AJgK0AIIAMgAKADIACgBYAvAAZABaADwAFABGADACqgBGAAAAHgAeACYCtABkACgAFAAeABQAMgAwAjIAKAAyABQATgLSADwAHgAUAAoAHgAAAB4AngJQAEYARgDqAYwAMgAUACgACgAeAAoAHgAeAMYCUAAUABICeAA8AAoAAAAKAAoACgAAAAAAAABOAgoAHAKqAEYACgAAAAoACgAKABQAAAAKAAAARAI=",
            "l": "BAG+AL4AbgBkAGQAZAB4AHgAeAC0ANwAjABuAEABMgCgAKAA3AAsAQQBDgFyAZoBXgFUAVoAZADSAMgANgEOAWgBfAGuAYYBpAH0AcwBZAB4ANwAtADmAAQBQAHWAdYBCAIIAhwCwgFGAKoAVAFoAXgAfAGGAQgCEgJOAv4BdgJUAVoA8ACGAeABrgFQAHwBOgIwAmICRAJyAcIBUAAsAV4BmgHWAdYBbgC4AfQB/gEcAiIBuAF4ACwBcgFyAZABwgESArQAEgImAjACwgFUAW4AIgFKAUoBQAFoAaQB4AGWAIoCWAKkAbgBjAAiASwBBAHmACIBSgGkAcwBqgBEAswB4AGWADYBXgEYAb4A5gDwANwAGAGQAaoAzAGkAXgASgEOASIB0gC+AKoAqgD6AA4BIgGqAMIBggBAASwBoADSAKAAqgCgALQAvgC+ALQAvgA=",
            "opportunities": 25919,
            "raisePct": 26,
            "shovePct": 20,
            "limpPct": 28,
            "rfiPct": 46,
            "completeCells": 169,
            "minimumCellOpportunities": 55
          }
        },
        "<15": {
          "EP": {
            "n": "vwIAAMEBAACwAQAABAIAAMgBAADMAQAAwAEAAMABAACzAQAAywEAANcBAADDAQAAwQEAACsFAADLAgAA2gEAALsBAACyAQAA2gEAANMBAADOAQAAtQEAANwBAADEAQAAsQEAAOkBAABHBQAANgUAAMsCAAC5AQAA2wEAAPABAADXAQAAtgEAALcBAAC7AQAArAEAAMsBAADIAQAAYQUAAHAFAAAiBQAAlAIAAMgBAAC3AQAArAEAAOwBAAC3AQAAswEAALwBAADSAQAAswEAAKkFAAAgBQAAMAUAAEkFAAC8AgAAzAEAAMcBAADeAQAA1wEAAM0BAAC+AQAAwQEAAMgBAAAgBQAAdAUAAEAFAABqBQAAEwUAAMUCAADAAQAAzQEAAMYBAADNAQAA4QEAAK4BAADPAQAAmAUAACkFAABcBQAAaQUAAE4FAAAwBQAAngIAAL8BAACaAQAAywEAAMwBAACrAQAAvgEAAGQFAABJBQAAMAUAAFAFAABIBQAAAAUAAEEFAACDAgAA7QEAAMMBAAC0AQAAyQEAAJ0BAAAyBQAAfAUAAHQFAAAyBQAApgUAAEwFAABrBQAAVQUAAKYCAADCAQAA0gEAANUBAADdAQAAYAUAAHsFAABQBQAAXgUAADEFAABtBQAAagUAAFoFAABfBQAAvAIAALoBAAC3AQAA3wEAABAFAABEBQAAWQUAAF8FAABDBQAAbwUAADEFAABVBQAAYgUAABwFAADWAgAAxQEAAK8BAABWBQAAkQUAAEsFAAA3BQAAUAUAABsFAABYBQAAUgUAAFEFAAAuBQAAqgUAAIICAADEAQAAcwUAAJYFAACcBQAASAUAAHgFAAA3BQAAfQUAAE0FAAAlBQAAIgUAAH0FAAA9BQAAmwIAAA==",
            "r": "4AG+AMgAtADmAOYA8AC+AKoAoACqAFoAUACWALgBIgEEAfAAggBQAB4AFAAKAAoACgAAAJYA3AAiAQ4BvgBaADIAAAAAAAAAAAAAAAAAtAB4ADIAyADmAEYAFAAKAAAAAAAAAAAAAAC0AB4ACgAKAIwAeAAKAAAAAAAAAAAAAAAAAB4ACgAAAAAAAACMADwACgAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAlgBQAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAHgAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "j": "uAH4AgIDAgOyAkQCzAGuAUoBpAEYARgB+gA+A/4BigJEApAB5gCqAFoAUAAyAB4AKAAUACoDMAKKAswBaAGgAFAAKAAeABQAFAAUAAoA+AIiAYwAAgMiAYIAPAAoAAoACgAKAAAACgBYAoIAUAAyADQDvgAyABQACgAKAAAAAAAAAAQBKAAUAAoAFAAqA1oAKAAAAAAAAAAAAAAAqgAUAAoACgAKAAoAIANQAB4ACgAKAAAAAAB4AAoACgAAAAAAAAAAAAIDPAAKAAoAAAAKAFAACgAAAAAAAAAAAAAAAACoAjIAFAAKAAoAZAAAAAAAAAAAAAAAAAAAAAAACAIKAAoAAAAyAAoACgAAAAAAAAAAAAAAAAAKAIYBCgAAADIAAAAKAAAAAAAAAAAAAAAAAAAAAAAiAQoAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AA=",
            "l": "PAAUAAoACgAUAB4AFAAeAAoAFAAKACgACgAKAB4ACgAUAB4AFAAAABQACgAAAAoACgAKAAoAFAAeACgAHgAUABQAAAAAAAoACgAKAAoACgAUAAoAFAAoABQACgAAAAAACgAKAAAAAAAKAAoACgAKAAoAHgAKAAoAAAAAAAoAAAAAAAAACgAAAAoAAAAKAAoAAAAKAAoAAAAAAAAACgAKAAoAAAAAAAoACgAKAAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAKAAoACgAAAAoACgAAAAoAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAB4ACgAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 150602,
            "raisePct": 3,
            "shovePct": 12,
            "limpPct": 1,
            "rfiPct": 15,
            "completeCells": 169,
            "minimumCellOpportunities": 410
          },
          "MP": {
            "n": "KwIAAHQBAACJAQAAWwEAAJYBAABmAQAAdgEAAHYBAAB1AQAAYQEAAJIBAACLAQAAWwEAAFIEAAAzAgAAdwEAAHsBAABqAQAAZQEAAE4BAABgAQAAYQEAAFEBAABoAQAAYgEAAHoBAABVBAAAWQQAAC4CAABpAQAAYQEAAF8BAACCAQAATgEAAFABAABsAQAAcgEAAFYBAABVAQAAcQQAADQEAABABAAATQIAAF4BAABSAQAAWQEAAGMBAABOAQAAiAEAAGoBAACLAQAAeQEAAE0EAAB7BAAAKgQAAHwEAAA+AgAAawEAAGUBAABoAQAAUAEAAGEBAABkAQAAUAEAAFkBAAB7BAAAKAQAABQEAAA2BAAANAQAABECAAB0AQAAZwEAAGABAABwAQAAYAEAAGYBAABmAQAAXAQAADYEAABTBAAAKwQAAC4EAAA7BAAAEAIAAIYBAABhAQAAdwEAAG4BAABVAQAAYgEAACcEAABJBAAAaAQAACEEAAALBAAACgQAAA0EAAAkAgAAYAEAAF4BAABIAQAAbAEAAHQBAABbBAAAIAQAAEYEAABUBAAANQQAAAYEAABABAAAOgQAAAcCAABZAQAAaQEAAHEBAABsAQAASQQAACMEAAALBAAAHAQAABoEAABPBAAAEwQAADoEAAAoBAAABgIAAFEBAABuAQAAawEAAA4EAABCBAAAZQQAAAwEAAAiBAAAQwQAAFUEAABBBAAAYAQAAAMEAAAWAgAAZAEAAGUBAAAkBAAA3wMAABsEAABBBAAAKAQAADIEAABOBAAAJgQAAC0EAADUAwAALwQAAB8CAABDAQAAIwQAAFQEAAAeBAAA6gMAAE8EAAAyBAAAPwQAAB4EAAA0BAAAGAQAADIEAAA1BAAAHwIAAA==",
            "r": "/gHmAMgAoAC+AL4A0gC+AL4AoACgAG4AggCgAMIBDgEOAQQBlgBaAFAAKAAeABQACgAKAIwA5gA2AQQBNgGWAEYAFAAAAAAAAAAAAAAAoACqAFAA0gDSAIIAKAAAAAAAAAAAAAAAAACqADIAHgAUAKAAlgAyAAoAAAAAAAAAAAAAAEYAAAAAAAAAAACMAFAAFAAAAAAAAAAAAAAAHgAAAAAACgAAAAAAeAAyABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAG4AMgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABuACgACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAWgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "j": "mgHuAgIDIAMCA4oCMAImAswB1gFyAVQBIgEqA+oBngJ2AuoBVAG0ALQAZABQACgAHgAeACoDYgKKAhICcgHIAIIAMgAeABQAFAAUAAoADAOaAb4AAgNyAcgAUAAyAAoACgAKAAoACgC8ArQAZABQACoD5gBQACgAFAAAAAAACgAAAGgBKAAeAAoACgAgA5YAKAAUAAAAAAAAAAAA+gAUAAoACgAAAAoAKgNkABQACgAKAAAAAAC0AAoACgAKAAAACgAKACADbgAKAAAAAAAAAHgACgAAAAAAAAAAAAAACgDQAh4ACgAKAAAAZAAKAAAAAAAAAAAAAAAAAAAAgAIKAAoAAABGAAoACgAAAAAAAAAAAAAAAAAAAAgCFAAAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAACQAQoAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAE=",
            "l": "PAAKAAoACgAKABQAFAAKAAoAFAAeABQACgAKACgAFAAeABQAFAAKAAAACgAKAAAACgAKAAoAFAAUAB4AHgAUABQAAAAKAAoACgAAAAAACgAUAAoAAAAeABQACgAAAAAACgAAAAoAAAAKAAoACgAKAAoAKAAKAAAAAAAKAAAAAAAAAAoAAAAAAAoACgAUAAoACgAAAAoAAAAAAAAACgAAAAAAAAAKAAAAFAAKAAoACgAAAAoACgAAAAoAAAAAAAAAAAAKAAoAFAAAAAAAAAAAAAoAAAAKAAAAAAAAAAoAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAKAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 119052,
            "raisePct": 4,
            "shovePct": 13,
            "limpPct": 1,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 323
          },
          "HJ": {
            "n": "3wEAACsBAAAQAQAALQEAACwBAAAwAQAA8wAAABwBAAAeAQAAGAEAABgBAAADAQAAMAEAAKcDAACsAQAAGQEAAC0BAAAoAQAADAEAACgBAAAiAQAAGAEAABQBAAD+AAAAEwEAABQBAAB+AwAAggMAAK0BAAAMAQAACAEAAP0AAAAzAQAAIQEAAAIBAAAdAQAAJgEAAA4BAAARAQAAtwMAAHsDAABiAwAApgEAAA8BAAAYAQAAAAEAACoBAAAYAQAAIwEAAAQBAAAjAQAAHAEAAGwDAAAmAwAAkgMAAJgDAAC5AQAAJQEAACYBAAANAQAANAEAAAsBAAARAQAABgEAADQBAAB2AwAAJQMAADwDAAAzAwAAJAMAALwBAAD5AAAAGwEAACUBAAAXAQAABgEAABoBAAAMAQAAuAMAAEQDAABcAwAAPAMAACEDAABBAwAAqgEAACIBAAADAQAA8QAAABMBAAA4AQAAGAEAAFgDAAAgAwAAWQMAADQDAAA+AwAAVQMAAD8DAACnAQAAEgEAAAsBAAAvAQAADAEAAPkAAABXAwAAcwMAABsDAAAxAwAAPAMAAN0CAAAyAwAAFAMAAJIBAAANAQAA+wAAAAsBAAAoAQAAbQMAAFIDAABrAwAAbwMAAEcDAAAcAwAAHQMAADQDAAD1AgAAgQEAABMBAAAEAQAAHAEAABcDAABeAwAAVQMAACcDAAATAwAAPgMAADkDAAAjAwAALwMAACYDAACfAQAAEAEAACUBAAB9AwAAcgMAAE0DAAAsAwAAOQMAAEcDAAA3AwAASgMAADoDAABAAwAAPgMAAJABAAALAQAATQMAAEcDAAAUAwAAMgMAACQDAAAnAwAAFwMAACMDAABaAwAAKAMAADMDAAAiAwAAewEAAA==",
            "r": "CAIiAaAAlgDcANIAlgCqAL4AvgC+ALQAlgCgAJoB8ADIAA4B0gCWADwAMgAeADIAFAAUAIIA0gBAASIB8ACqAHgAPAAKABQACgAKAAAAlgDmAIwA8AD6AJYARgAeAAoAAAAAAAAACgC+AHgAUAA8AJYAoAAyABQACgAAAAAAAAAAAG4AKAAAAAoACgBkAIIAMgAKAAoAAAAAAAAAUAAKAAAAAAAAAAoAeABGAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAHgAKAAKAAAAAAAAABQAAAAAAAAAAAAAAAAAAABkACgACgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAeAAeAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAFoACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABaAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgA=",
            "j": "mgGoAiADKgPaAtACvAKAAmICOgK4AcwBmgEqAxwC0ALQAjACmgEsAdwAeABkAFAARgBGAD4DvAJ2AggCzAFUAbQAKAAoAB4AHgAoABQAIAPgATYB2gK4AfoAggAeABQACgAAAAoACgDQAvoAjABuADQDLAE8AB4AFAAAAAAACgAAABICUAAoABQAFABmA9IAKAAeAAAACgAAAAAAwgEoABQACgAKAAAAUgN4ACgAFAAAAAAAAAAYAR4AAAAKAAAAAAAAACADbgAUAAoAAAAKAMgACgAAAAAAAAAAAAoAAAAMAzIACgAUAAAAtAAKAAAAAAAAAAAAAAAAAAAA0AIeAAoACgCMAAoAAAAAAAAAAAAAAAAAAAAAAGwCCgAKAIIACgAAAAAAAAAAAAAAAAAAAAAAAAD+AQAAZAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAcgE=",
            "l": "PAAKAAoACgAAAAoACgAUAAoACgAAABQACgAKAB4ACgAUABQAFAAKABQAFAAAAAoAFAAAAAoACgAeABQAHgAKAB4ACgAKAAoAAAAAAAAACgAKAAoAFAAoABQAAAAAAAoAAAAKAAAAAAAKAAoACgAKAAoAFAAKAAoAFAAAAAoACgAAAAoAAAAKAAAACgAKABQAAAAKAAAAAAAAAAAACgAAAAoACgAAAAAACgAUAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAKABQAKAAAAAAAAAAAAAoACgAKAAAAAAAAAAAACgAKAAoAAAAAAAAACgAKAAAACgAAAAAAAAAAAAAAFAAAAAoAAAAKAAoAAAAAAAAAAAAAAAAAAAAKAB4ACgAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACgAAAAoACgAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 92459,
            "raisePct": 5,
            "shovePct": 16,
            "limpPct": 0,
            "rfiPct": 20,
            "completeCells": 169,
            "minimumCellOpportunities": 241
          },
          "CO": {
            "n": "gQEAAO0AAADqAAAA6gAAAPsAAADZAAAA5AAAAOsAAADqAAAA4AAAAN4AAACtAAAA+wAAAPACAABUAQAA5AAAAOkAAADTAAAAygAAAMsAAADpAAAA1AAAANsAAADgAAAA3QAAAMoAAACbAgAAqgIAAFwBAADaAAAAwQAAANkAAADdAAAA+AAAAO4AAADfAAAA1wAAAMsAAADHAAAAtQIAAKECAACMAgAAOQEAANUAAADSAAAAyAAAALoAAADUAAAA6QAAANkAAADZAAAAyAAAAMYCAACVAgAAlQIAAIYCAABIAQAAygAAANoAAADZAAAA2AAAAMUAAADsAAAA0gAAAMIAAAC1AgAAwQIAAGUCAACTAgAAoQIAAFMBAADkAAAA1AAAANUAAADaAAAAyQAAAM8AAADWAAAA2gIAAIUCAABEAgAAjwIAAK8CAACCAgAARQEAANYAAADkAAAAuwAAAL4AAADbAAAAzAAAAI4CAABIAgAAlgIAAGwCAACJAgAAbgIAAE8CAAAtAQAA1wAAANEAAADKAAAAtgAAANMAAAClAgAAbwIAAIwCAACQAgAAVwIAAHUCAABkAgAALAIAACEBAADAAAAA0QAAAMMAAAC3AAAAiAIAAGUCAACRAgAAiQIAAHMCAACQAgAAPgIAAEQCAABcAgAAOQEAAMMAAAC/AAAA2QAAAKMCAACPAgAAdgIAAIcCAABtAgAATQIAAEUCAABKAgAATwIAAFACAAA9AQAAwwAAAM0AAACyAgAAWwIAAGgCAABzAgAAdQIAAHECAACEAgAAewIAAFsCAABNAgAAdQIAADoBAADJAAAAtwIAAF8CAABZAgAAYQIAAIECAABaAgAAPAIAAG8CAAB9AgAAOgIAAGACAAB/AgAALwEAAA==",
            "r": "CALwAKAAyACMAMgAvgDcANIAqgDIAKAAtACgAK4BtAC0AOYAyADIAIwAoACCAIwAPABkAKAAyACQAfoA3ADmAOYAjABGADwAKAAUADIAjADcANwA0gDcAMgAqgBkADIAFAAUAAoAAACgALQAqgCCAKAA+gCgAGQAHgAKAAoACgAKAJYAWgA8ACgAKACMAIwAWgAyABQACgAKAAAAeABGABQAHgAKABQAeACqAEYAFAAAAAoAAAB4ABQAFAAKAAoAAAAKAIIAWgAUAAoAAAAAAFoACgAAAAAAAAAAAAAACgB4AGQAHgAUAAoAbgAKAAoACgAAAAAAAAAAAAAAeAAoAAoACgBGAAAAAAAAAAAAAAAAAAAAAAAKAGQAFAAAADIACgAAAAAAAAAAAAAAAAAAAAAAAAB4AAoARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAA=",
            "j": "pAHaAj4DAgM0A+4C7gK8Ap4CvAKAAhICTgIqAwgCDAP4AqgCHAK4AUAB+gDSAKAAqgBkADQD2gJEApQCWAKuAQ4BoABkAB4ARgAyAB4ANAN2ArgB7gJsApAB0gBaACgAKAAUABQACgAWA64BBAHwACoDfAG+AFAAHgAKAAAAAAAUALwCyABGACgAMgA0A9wARgAUAAoACgAAAAAAbAJkADIAFAAKAB4AUgPwACgAFAAKAAAAAAASAjwACgAKAAAACgAUAD4DyAAoAAoAAAAAALgBKAAKAAoACgAAAAoACgBIA24ACgAAAAAAfAEoAAoAAAAAAAoAAAAAAAoADAM8ABQACgBUARQAAAAAAAAAAAAKAAAAAAAAAMYCHgAAACIBHgAKAAAAAAAAAAAAAAAAAAAAAACKAgAABAEeAAAAAAAAAAAAAAAAAAAAAAAAAAAACAI=",
            "l": "MgAUAAAAAAAAABQAAAAKAAoAAAAKAAoAFAAKAB4ACgAAAAoACgAUABQAAAAAAAAACgAAAAAACgAKABQAHgAeACgAHgAKAAoAAAAAAAAACgAUABQAFAAUAB4AFAAAAAoAAAAAAAAAAAAKAAoACgAKAAoACgAUAAoACgAAAAoAAAAAAAAACgAAAAAAAAAKABQACgAUAAoAAAAKAAAACgAAAAoAAAAKAAAAAAAyAAoAAAAKAAAAAAAKAAAAAAAAAAAAAAAAAAoACgAKAAoACgAAAAoACgAAAAAAAAAAAAAAAAAAABQACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAeAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 70367,
            "raisePct": 6,
            "shovePct": 20,
            "limpPct": 1,
            "rfiPct": 27,
            "completeCells": 169,
            "minimumCellOpportunities": 173
          },
          "BTN": {
            "n": "QgEAALUAAAC0AAAAwwAAAK4AAAC2AAAArwAAAKEAAACoAAAArgAAAKwAAACwAAAAqwAAAEMCAADzAAAAsgAAALQAAACeAAAArAAAALIAAADCAAAApwAAAJoAAACrAAAAowAAAKwAAAAvAgAA+gEAACABAACpAAAAowAAAJ8AAACXAAAAnwAAALAAAACvAAAApQAAAKAAAACqAAAAMgIAAPYBAAD7AQAA+QAAAKQAAACdAAAAlQAAAJEAAACKAAAAqAAAALsAAACDAAAAogAAACUCAAAUAgAAJAIAAO8BAAAIAQAArwAAALIAAACZAAAArwAAAK4AAACtAAAAqwAAAJoAAAAlAgAA5wEAAOMBAAD+AQAADAIAAPcAAACPAAAAogAAAJkAAACWAAAAogAAAKsAAACVAAAAMQIAANkBAADgAQAA8gEAAOABAAAKAgAA/gAAAJgAAACkAAAAnQAAAKMAAACFAAAAmgAAABoCAADpAQAA+wEAAOMBAADcAQAA5AEAAOgBAADaAAAAnQAAAKEAAACYAAAAlQAAAJUAAAD3AQAADgIAABACAADbAQAA6gEAAOYBAADkAQAA2AEAAN4AAACbAAAApAAAAI4AAACDAAAAJAIAANsBAAAFAgAA6AEAAOIBAAD5AQAA9QEAALIBAADbAQAA7gAAAJsAAACRAAAAjwAAAAkCAADtAQAAvQEAAOABAADGAQAAzgEAAMcBAADeAQAAyQEAAN8BAADXAAAAmAAAAJEAAAALAgAA5gEAANwBAAD9AQAA0AEAALYBAAC6AQAA2AEAAM8BAADRAQAArQEAANMAAACaAAAA7AEAAPMBAADvAQAA+gEAAMQBAADdAQAA6gEAAPEBAADNAQAAugEAAMkBAADOAQAA9AAAAA==",
            "r": "JgJAAeYA5gDcAOYAvgDIAIIA3ACCANIAoADcAPQBDgHcANwA5gAEAeYABAG0AL4AyAAEAaAA0gCaAcgA5gD6ANwADgEiAaoAqgCgALQAyADmAAQBVAEsAfoAQAG+AG4AeACMAG4AlgCqAOYA5gAEAeYADgHmAL4AtAB4AHgAPAAyAIwA0gC+ALQAjAC+ANwABAGCAHgAWgBGAFAAqgC+AKoAjABkAG4AjAAYAdwAggA8ADIAPACgAIwAWgBkAEYAPABuAIwA+gDcAG4ARgA8AJYAggBQADIAHgAyACgAWgBuAIIAWgA8AFAAlgBuADwAKAAUAB4AHgAyAFAAjACMAGQAKACgAEYAMgAeABQACgAKAAoAFAAoAFoAWgBuAIwAWgAoADIACgAKAAoAAAAUABQACgBuAEYAjABaADwAFAAUABQACgAKAAoACgAUAAoAlgA=",
            "j": "mgGAAtoC5ALuAuQCAgP4AhYD0AIWA9oC0AL4AqQBxgLkAsYCWAI6AvQB4AGQAbgBfAE2ASoD7gIwAuQClAI6AhwCQAEsAeYAtACgAIwAAgOoAk4CdgJsAswBaAEOAYIAeABQABQAHgAgA1gC9AGGAeQC/gFKAbQAbgBGAAoAPAAoACoDpAH6AL4AggACA64BqgCCABQAHgAUADIA+AJKAZYAeAAyAFAASANeAYIAPAAoAAoACgDGAiIBZABGAB4AHgAyAD4D+gBkADIACgAeALwCqgBGAB4AFAAUAB4AMgBIA8gAeAAoABQAqAKWACgAFAAKAAAACgAUABQAKgOCACgACgBsAngAHgAUAAoACgAAAAoACgAKAFIDPAAeAFgCeAAyABQAAAAAAAoAAAAAAAAACgACAxQAMAJkADIACgAKAAAACgAKAAAAAAAAAAoAdgI=",
            "l": "HgAUAAoAAAAAAAAACgAAAAoACgAKAAAACgAAADIACgAUAAoACgAUABQAAAAAAAoAHgAUAAoACgAUAAoACgAKAAAACgAKAAoACgAKAAoACgAUAAoAAAAKACgAMgAUAAAAFAAAABQACgAKAAoACgAKABQAFAAeAB4ACgAUAAAAAAAKAAoACgAKAAoACgAUACgAFAAeAAoACgAAAAAAAAAUAAoACgAAAAoAAAAUAAoACgAUAAAAAAAAAAAACgAAAAAAAAAKAAoAHgAKABQAAAAAAAAACgAAAAAAAAAAAAoAAAAAAB4AAAAKAAoAAAAKAAoAAAAAAAAACgAAAAAACgAKAAAACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAoAHgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 54260,
            "raisePct": 12,
            "shovePct": 27,
            "limpPct": 1,
            "rfiPct": 39,
            "completeCells": 169,
            "minimumCellOpportunities": 131
          },
          "SB": {
            "n": "CgEAALQAAACwAAAAmgAAAKAAAACiAAAAlwAAAIgAAACKAAAArgAAAJwAAACMAAAAgQAAACECAADWAAAAnQAAAJwAAACMAAAAcwAAAK4AAACbAAAAiwAAAJMAAAB2AAAAigAAAIUAAADdAQAAkwEAAOcAAACEAAAAowAAAJoAAACNAAAAmAAAAJAAAACHAAAAhwAAAH0AAAB0AAAA7gEAAL0BAADLAQAA5AAAAIoAAACQAAAAeAAAAIYAAACfAAAAlwAAAIEAAACeAAAAiwAAABgCAADOAQAAuQEAAL4BAADYAAAAdQAAAI8AAACGAAAAkAAAAIgAAAB9AAAAfgAAAIAAAAC+AQAAlQEAALkBAACtAQAAxAEAAMgAAACOAAAAhwAAAIgAAAB7AAAAggAAAHsAAACKAAAA5AEAAOIBAADDAQAAjAEAAKgBAACcAQAAuwAAAIwAAACDAAAAfgAAAIsAAACFAAAAdAAAALYBAADRAQAAiwEAAJoBAADOAQAAjgEAAK0BAADAAAAAjQAAAIQAAAB3AAAAhwAAAHIAAADXAQAArAEAALkBAACcAQAAugEAAIMBAACJAQAAaQEAAMIAAAB2AAAAfQAAAGsAAAB7AAAA2QEAAK8BAAB0AQAAgwEAAKoBAACQAQAAgQEAAJMBAAB1AQAAyQAAAHwAAABqAAAAhAAAAMMBAACXAQAAiQEAAL8BAACnAQAAswEAAH8BAAByAQAAfQEAAIkBAACoAAAAgQAAAHMAAACyAQAAfAEAAJ0BAACEAQAAuQEAAIEBAACOAQAAgwEAAIoBAACVAQAAfQEAAKsAAACHAAAAyQEAAJMBAACBAQAAewEAAIsBAACIAQAAfAEAAGQBAABxAQAAogEAAHYBAABgAQAAzQAAAA==",
            "r": "mgHIANwAoACgAKoARgC0AIIAeAB4AFoAggDmAMIB3ACqAJYAlgCWAIwAeACWAFoAtABuAKAAjABAAYwAjACMAJYAbgB4AKoAggA8AIIAlgCMAKAAIgFaAHgAggBkAFoAbgBuAHgAeAB4AIIAlgCMAMgAoACCAG4AlgBkAFoAPABaAFoAbgCMAHgAbgCgAG4AZABuAHgAjACMAG4AbgBuAG4AbgCMAIIAZABaAIwAeABGAEYAUABkAHgAbgBGAFoAWgBkAG4AjABaAHgAWgBuAHgAbgBuAHgAWgBuAGQAWgA8AFoAjABuADwAbgB4AFoAeABkAGQAZABkAEYARgBuAG4ARgBQAGQAZABkAFoAWgBaAEYAWgBkAGQAbgBkAGQAZACCAFAAUABQAFoARgBGAG4AWgA8AFAAggBkAGQAbgBkAFAAWgBkAFoAZABGADwAPAA=",
            "j": "BAGKAooC+AICA+4CXAMCAyoDNANSAzQDIAOyAiwB0AL4AvgC+ALkArIClAKeAtoCbAJsAgwDDAPgASAD2gLkAmwCMAIwAuoBpAH+AYYBFgM0A+QCTgL4AsYCigISApABXgFUATYBNgFIAwIDlAJ2AtACdgIIApoBXgEsARgBIgHIAFIDxgISAsIBhgEgAwgC9AGkAdIA+gCWALQASAOKAtYBmgE2ARgBZgNYAnwBGAGqAKoAlgBIA3YCcgEYAdwAyAAYAVwDEgJeAeYAvgBuABYDJgJKAbQAoACWAL4A0gBcA64BGAHmAJYAPgMSAjYBvgCCAG4AbgB4ALQAZgOaAbQAjAA0AxwCDgG0AG4AZABuAFoAWgCCAEgD+gCqACAD1gEOAaAAUABGADwAPABaAFoAbgBcA6AA+AK4AfAAeABaAFAARgBaAFAAKABaADwAKgM=",
            "l": "QAF4AHgAMgA8ADIAMgAoACgAFAAUADIAMgBGAPoAKAAyAFAARgBQAGQAggB4AHgAlgCgACgAKAC+ACgAbgBaALQA5gDcAOYA3ADmACwBKAAeADwAeABuAG4AqgAOARgBIgEYASIBNgEUADwAggCgAEYAlgDwAA4BIgFAAVQB8ABAAR4AUADIAAQBGAEeABgBSgHSACIB+gAYASwBFABuANIA+gAEASwBHgDwAFQBuAG4AUABNgEeAFoAtAD6AAQB+gA2ARQA8ABoATYBVAEEAR4AggC+APAA5gDwABgBBAE8AEABcgEiAUoBFACMANwAyACqALQAtADcACIBKAByAVQBQAEoAHgAqgCqAKoAqgCqAKAAyAD6ACgADgE2ASgAlgCqAIwAggBkAG4AbgCgAKAAoAAyADYBMgB4AKAAggBuAG4AZABaAG4AjAB4AIwAPAA=",
            "opportunities": 46051,
            "raisePct": 12,
            "shovePct": 42,
            "limpPct": 16,
            "rfiPct": 54,
            "completeCells": 169,
            "minimumCellOpportunities": 106
          }
        }
      }
    },
    "l3": {
      "label": "Лига 3",
      "shortLabel": "Лига 3",
      "ranks": "текущая лига",
      "description": "Активные реальные игроки текущей Лиги 3 с минимум 30 000 рук в окне FFEV.",
      "players": 975,
      "selectedPlayers": 975,
      "charts": {
        "70+": {
          "EP": {
            "n": "fy8AAHEfAACqHgAASx4AABQeAAC3HgAAeB4AACgeAAD5HQAA2h0AAJ0dAAAIHgAA5h0AADtcAAB1LgAASB4AAA0eAADlHQAADx4AAIMdAAD6HAAACR0AAA4dAAD/HAAA+xwAAH8dAACJXAAAoVkAAKovAAB/HgAAgx0AAO8dAACfHQAAAh0AAEQcAAC8HAAAgBwAAI8cAAAUHQAAe1oAABpYAADvWAAA/C4AAJkeAACXHAAAvx0AAK4cAAAcHQAA7xwAAPYcAADyHAAAxxwAAOVZAADoVwAAhlcAABxXAABuLgAAAB4AADYdAABCHAAA6RwAAAAdAABOHAAAvBwAALUcAABFVwAAQlYAAEtWAAAjVgAA5FUAALkuAACTHgAAhx0AAN0cAAC5HAAATx0AAD4dAADLHAAAzlYAAOpWAAAPVwAA/1YAAJBWAABnVgAAuC0AAFwdAADJHAAArhwAAA8dAABSHAAArB0AAOxXAABaVgAAaFYAAJNVAACOVgAAalcAAOdWAAATLQAAyB0AACodAACkHAAAzxwAAP8cAABBVgAA5VYAAINWAAAHVgAAtlcAADpWAAADVgAAXVYAAHctAAC9HQAAaBwAAN0cAADFHAAAHlYAAGRWAADdVgAAmlYAAOVWAAASVwAAFFcAAONWAACwVgAADi0AANocAADfHAAA7xwAAA1XAADgVgAACFcAAGNWAACrVgAARFYAAD5WAAADVgAA9FYAAM9VAABaLAAASh0AAGocAAC8VgAAmVYAAIJWAAADVwAAa1YAAFVWAADAVgAABVYAAIJWAADhVQAAQ1YAAEksAAAAHQAAZVYAAPVVAAAGVwAAtFUAACxWAACaVgAAY1YAAMlVAACZVgAAGFcAAC9WAAC/VgAAWywAAA==",
            "r": "1APeA94D3gPeA94D1APKA8AD1APAA7YDogPeA94D3gPeA9QDrAM0A2ICDgG0AIIAbgBQAN4D1APeA94D1AOOA9ACWgAUAAoACgAKAAoA3gOOA9YB3gPUA4QD2gJGAAoACgAAAAAAAADKA3IB8ADmAN4DwAOKAkYACgAAAAAAAAAAAOYACgAKAAoACgDeA5gDjAAUAAAAAAAAAAAAZAAAAAAAAAAAAAAA3gN6A1oACgAAAAAAAAAeAAAAAAAAAAAAAAAAAN4DPgMeAAoAAAAAAAoAAAAAAAAAAAAAAAAAAADUA8YCFAAKAAAAFAAAAAAAAAAAAAAAAAAAAAAAygM2AQoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAIQDHgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAACyAgoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 2473417,
            "raisePct": 22,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 22,
            "completeCells": 169,
            "minimumCellOpportunities": 7234
          },
          "MP": {
            "n": "OCQAAEQXAADbFgAAyBYAAMMWAABTFgAAihYAAI8WAAC9FgAAQBYAAFEWAABbFgAApxYAAG1GAACJJAAA/xUAALMWAAD+FQAA7hUAAGIWAADyFQAArxUAAAQVAACwFQAAeBUAADIVAAD1RAAAmkMAAG8jAABoFgAA6hYAABkWAAAdFQAAlRUAAMUVAAAlFQAA7RQAAJMVAACHFQAAX0QAALVEAACuQgAADyMAAJwWAABxFgAAWxYAAJ4VAACHFQAAQRUAAAYVAAApFQAA2xQAALRDAAAOQwAALkEAAD1BAAB9IgAAlhYAADMWAABLFQAAXRUAAOIUAAC6FQAALBUAAKcUAAC8QQAA5kAAAL4/AADNQAAAKUEAAPwhAAAGFgAAHxUAANQUAAApFQAALRUAAF4VAAAjFQAAj0IAALI/AAAiQAAAW0AAAPw/AABNPgAA3yEAALkVAABjFQAA+xQAAFoVAADjFAAAQhUAADtAAACtPwAAEEEAAPo/AABBPwAAyD4AANQ/AACaIQAAnRUAAB8VAAAXFQAAPBUAAIUVAABeQAAAF0AAAG5AAAA9PwAAFkAAAAdAAACGPgAA1j4AAKshAAB4FQAARBUAAOcUAAApFQAAF0AAAB9AAACoPwAAMEAAAKo/AAD2PgAANz4AADc/AAAzPwAA7iAAAFAVAAChFAAAjxUAAPA/AABdQAAAhj8AAB1AAAD4PwAAGD8AAO0/AAC5PgAAwD4AAHw+AABNIQAARBUAAB8VAADqQAAA6T8AAAxAAADWPwAAmz8AALY/AADkPwAAjT4AAFU+AAAyPwAAkT4AAAYgAAAIFQAAs0AAAHw/AACZPwAAtT8AAARAAADKPwAA/z4AAMk+AADdPgAAjT8AACU+AADlPgAAXyAAAA==",
            "r": "3gPeA94D3gPeA94D3gPUA8oD3gPKA8oDwAPeA94D3gPeA94DygOEA/gCOgK4AXIBNgEEAd4D3gPeA94D3gO2Az4D3AA8AB4AFAAUAAoA3gPKA0gD3gPeA7YDSAOqABQACgAKAAoACgDUA+QCYgJEAt4DygP4AqoAHgAKAAAAAAAAADoCMgAUABQAKADeA7YDGAEyAAoAAAAAAAAAVAEKAAoAAAAAAAoA3gOiA7QAFAAAAAAAAABaAAAAAAAAAAAAAAAKAN4DhANQAAoAAAAAAB4AAAAAAAAAAAAAAAAAAADeAyADKAAKAAAAKAAAAAAAAAAAAAAAAAAAAAAA1APqARQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAMADRgAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAABmAwoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1827919,
            "raisePct": 26,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 26,
            "completeCells": 169,
            "minimumCellOpportunities": 5281
          },
          "HJ": {
            "n": "vRoAAP0QAAClEAAAyRAAAGcQAABnEAAALxAAAHQQAABaEAAAyw8AAFIQAABhEAAAqg8AADEyAAC9GAAANRAAAHkQAAAuEAAABBAAAKYPAABvDwAAVA8AAHQPAABBDwAAgg8AAAMPAADmMQAAhDAAABcZAAAPEAAA+A8AAIsPAABbDwAAgg8AAKQPAADoDgAAiA4AALsOAADYDgAArTEAAFUvAACwMAAA4RgAAAsQAADKDwAAtQ8AALsOAAADDwAALw8AANAOAADKDgAANw8AAG0xAADjLwAAaC8AAPMuAACxGAAAJhAAAHQPAADDDgAAjg4AAEIPAACoDgAANA8AAAsPAAAHMAAAxS4AAIUtAAAaLgAAPy4AAKoXAABiDwAA2w4AALUOAADODgAAPQ8AAHUOAADgDgAADjAAAMMtAAB3LQAAfi4AAJ8tAADTLAAAUxgAAFYPAAD2DgAAyw4AALsOAADIDgAAjA4AALAvAADgLQAAvSwAAMIsAAApLQAA/ywAAM0sAAA1FwAASA8AAI0OAADvDgAACQ8AAMoOAAB1LgAAzi0AAMotAABRLQAAjywAAJksAABuLAAAqysAALoWAACFDwAAyA4AANMOAAB4DgAAyy4AAIItAAD/LAAAWy0AAFAtAAAHLQAAtCsAAMwsAABhKwAATxcAANcOAACeDgAAoQ4AALsuAAAjLQAArywAANAsAADZKwAA9isAAFUrAAA/KwAA1ysAAO8rAABXFgAAkA4AAEwOAABmLgAAniwAADMtAADWLAAAqiwAAJ0sAADSKwAAMywAACEsAACoKwAAqSsAAPkWAACTDgAACi8AAIQtAACALAAAMS0AAPArAAAJLAAAoysAABEsAACwLAAAZCsAACcsAABdKwAAQhYAAA==",
            "r": "3gPeA94D3gPeA94D3gPeA9QD1APUA9QDygPeA94D3gPeA94D1AO2A2YDFgPGAnYCRAIIAt4D3gPeA94D3gPKA4QDdgLwAKAAZABQAEYA3gPUA7YD3gPeA8oDmAMmAmQAPAAeABQACgDeA44DSAMqA94D1ANwAwgCZAAUAAoACgAKAEgDfAF4AGQADgHeA8oDdgKMAB4ACgAAAAAAqAI8AB4AHgAUACgA3gPAA+ABRgAKAAAAAADMARQAAAAAAAAAAAAUAN4DrAO0ACgACgAAAJYACgAAAAAAAAAAAAAACgDeA2YDbgAUAAAAoAAAAAAAAAAAAAAAAAAAAAoA1AOUAjIACgBaAAAAAAAAAAAAAAAAAAAAAAAAANQDjAAKAEYAAAAAAAAAAAAAAAAAAAAAAAAAAADAAxQAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1293216,
            "raisePct": 31,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 31,
            "completeCells": 169,
            "minimumCellOpportunities": 3660
          },
          "CO": {
            "n": "8BEAAEYLAAAXCwAARgsAAG0LAAAaCwAAIAsAAPwKAAC5CgAAkAoAABULAADcCgAAoAoAALwiAADGEAAAtAoAAPUKAAC1CgAAhQoAALsKAACQCgAAVgoAACIKAABMCgAAOQoAAFYKAAC9IQAAYyAAAA0RAACwCgAAXAoAAKkKAAArCgAAZQoAADEKAACMCgAA5gkAAPMJAACuCQAAQCIAANAfAABNHwAAEBEAAKgKAAAQCgAAOQoAAIwKAAA9CgAA5AkAAMMJAABvCgAA+QkAAOwhAAC+HwAAWh8AANkfAABoEAAANAoAACEKAACTCgAA/gkAABYKAAAlCgAA6wkAAPEJAABZIAAAWx8AAAIfAACRHgAADh8AAHYPAAARCgAA9QkAAM8JAAD9CQAAwAkAAL4JAACbCQAAuCAAAG4eAADeHQAAQx4AAL0dAADRHQAAQA8AAAoKAADHCQAA2AkAAI4JAACFCQAAqgkAAIAfAADYHgAA5x0AAHAeAABEHgAA6x0AACAdAAArDwAAxQkAAHoJAACpCQAAoQkAAD8JAADpHwAA9B0AACoeAAB8HQAAoh0AABcdAABTHQAAvhwAAGMOAAB+CQAAfwkAAIwJAACMCQAAGiAAAL4dAACYHQAAix0AAK8dAAAnHQAAJh0AAPIcAADrHAAAgg4AAKIJAACcCQAAIwkAABYgAADUHQAArh0AAJ8dAAD1HQAACR0AAOAcAAAUHQAAOhwAAJYcAACpDgAApQkAACkJAAA8HwAALR0AAIUdAAASHQAApRwAADodAAAMHAAAahwAACYcAABJHAAARBwAALUOAACKCQAAQB8AAJcdAAA4HQAA3RwAACUdAACfHAAA3RwAAP0cAAAtHAAATBwAAN0bAABkHAAARQ4AAA==",
            "r": "3gPeA94D3gPeA94D3gPeA94D3gPeA94D1APeA94D3gPeA94D1APUA8ADmAN6A2YDSAMWA94D3gPeA94D3gPUA8ADegMCA8YCdgJOAggC3gPeA9QD3gPeA9QDygNIA3YC6gGGAfoAyADeA8oDrAOiA94D3gO2AyADOgK+AGQARgA8AMADIAOyAoACngLeA9QDZgNOAtIAUAAyAB4AmANEAuABuAFKAa4B3gPUAyADkAFuACgAKABSA2gBPAA8ACgAKACqAN4DwANsAr4APAAoAAIDbgAeAAoACgAKAB4AWgDeA6IDpAGCACgAFgM8ABQACgAAAAAAAAAKACgA3gM0A6AAPADGAigACgAAAAAAAAAAAAAACgAUANQDcgFGAIoCKAAKAAAAAAAAAAAAAAAAAAAAAADKA24AOgIeAAoAAAAAAAAAAAAAAAAAAAAAAAAAygM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 855071,
            "raisePct": 43,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 43,
            "completeCells": 169,
            "minimumCellOpportunities": 2339
          },
          "BTN": {
            "n": "ZgsAACEHAACSBgAAxAYAAKIGAADKBgAAiAYAAEEGAAA6BgAAHQYAANEGAAB7BgAAJAYAAMoUAADfCQAAUgYAAIAGAACQBgAACQYAADgGAABVBgAA8AUAANgFAAAqBgAA5AUAAPAFAACTFAAAThMAAMMJAACFBgAAWAYAABYGAAAGBgAA9wUAAEAGAAAXBgAAIwYAAL0FAADmBQAARhQAAEMTAACCEgAA0AkAABUGAAAMBgAAIAYAAPMFAAAbBgAAvgUAAPkFAACvBQAAlQUAAIIUAAA7EwAAERMAAHMSAACbCQAAXgYAADUGAAAJBgAA7AUAABYGAADsBQAAiQUAABoGAADEEwAAahIAAEMSAABcEgAAyBEAADUJAAApBgAA6gUAANoFAAC6BQAAqgUAAKsFAAC+BQAATBMAAPgRAACYEQAAuhEAAAkSAAADEgAAGAkAANcFAADVBQAAwAUAAMAFAADEBQAAjwUAAHMTAABMEgAABxIAALQRAACzEQAAWhEAAEERAACTCAAA2gUAAGsFAAB5BQAAsQUAAIUFAADhEgAA1hEAAEwRAAAQEQAAJBEAAPUQAADDEAAAABEAAHcIAACWBQAAcQUAADIFAABsBQAAjxIAAFISAABlEQAAihEAAHQRAADwEAAAzhAAABsRAACKEAAAoAgAAGwFAAB0BQAAaQUAAO4SAAC9EQAANhEAABUSAABFEQAAohAAAL0QAAD4EAAANhAAANsQAAA/CAAAdgUAAHIFAAB4EgAAuBEAAHkRAABgEQAAvhAAAJEQAABiEAAAFRAAAGUQAADmDwAA7A8AAPAHAAAMBQAABhMAAKsRAACAEQAA5BAAAE8RAACbEAAAUhAAABUQAABPEAAAwA8AANkPAADMDwAATwgAAA==",
            "r": "3gPeA94D3gPeA94D3gPeA94D3gPeA9QD3gPeA94D3gPeA94D3gPeA94D1APAA8oDtgOiA94D3gPeA+gD3gPeA9QDygOsA5gDhAN6A3oD3gPeA94D3gPeA94D1APAA6IDcAM+Az4DFgPeA9QD1APKA94D1APUA7YDhAMWA9oC2gK8AtQDrAOYA4QDhAPeA94DwAOEAyoD0AKKAmwC1AOEA1IDSAP4AkgD3gPeA6wDXAPkAnYCOgLAAz4DvAKAAk4CYgICA94D1AOEAwwDqAImArYDDANiAswBmgGaAQgCxgLeA8oDXAPkAmICtgPaAggCDgGWAKAAyABeAUQC3gOiAwwDdgKiA6gCzAHIAG4AWgBuAIIAyACQAdQDNANiApgDgAKuAbQAWgBGADwAPABkAG4AoADeA3YChANiApABlgBGADwAMgAoADIAPABGADwAygM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 502267,
            "raisePct": 66,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 66,
            "completeCells": 169,
            "minimumCellOpportunities": 1292
          },
          "SB": {
            "n": "3AQAAOsCAADzAgAA7wIAAMQCAADMAgAAzwIAAOYCAAC7AgAAxAIAAK4CAADJAgAAWwIAAKIIAAAyBAAA1gIAAKICAAC+AgAAsQIAAKECAAB1AgAAcQIAAHsCAACYAgAAhQIAAJ0CAACsCAAATwgAACQEAACIAgAAiwIAAH0CAAB7AgAAiAIAAHQCAACaAgAAXgIAAGwCAABeAgAArQgAANgHAADABwAABQQAAIkCAADBAgAAaAIAAH0CAAA6AgAAgAIAAFkCAABLAgAANgIAAHMIAABeCAAAvAcAAAIIAAADBAAApgIAAFkCAABjAgAAcQIAAGACAABSAgAAeAIAAIICAACxCAAA0AcAAMcHAABlBwAAnwcAAKYDAAA8AgAAbAIAAGACAABrAgAAXgIAAHICAABSAgAAJggAAIwHAABgBwAAjgcAAJ0HAABkBwAAtQMAAHsCAABbAgAASgIAADkCAAAnAgAAQAIAAPIHAACcBwAAZAcAAFMHAAA8BwAADAcAAOkGAABYAwAAPwIAACoCAABXAgAASAIAAEwCAAAyCAAAaQcAABUHAABrBwAAFgcAAAQHAADiBgAA4QYAAGgDAABTAgAAXQIAACkCAAAgAgAABggAAFcHAAAABwAAMQcAADcHAAAOBwAA8gYAAOkGAACMBgAAigMAACoCAABSAgAAMwIAAM0HAAB/BwAAFgcAAFsHAAA6BwAAEgcAAIUGAAClBgAAXQYAAH0GAAB9AwAARwIAABcCAAD4BwAADwcAAPcGAABNBwAAAgcAAMIGAAC9BgAAlwYAAH0GAACQBgAABgYAACADAAA6AgAAygcAADoHAAAoBwAAAwcAAOMGAAC0BgAAtQYAAL0GAABdBgAAYAYAAFMGAABpBgAAUgMAAA==",
            "r": "jgOiA7YDtgO2A44DogOEA3oDhANwA4QDXAPAA5gDtgO2A5gDhAM+AzQDDAMCAwwD2gK8AsoDtgO2A44DcAM0A+QCngKeApQCigJYAk4CygOOA3ADtgN6AyADDAOKAk4CMAImAkQCEgK2A1wDNAMWA8ADIAPGAqgCOgL+Af4B6gHCAZgDFgO8AnYCdgK2A9oCigImAggC4AHqAa4BcAO8Ak4CHALgAeoBogPuAk4COgLCAcwBzAFcA4AC/gGkAZoBkAHWAY4DsgI6AuAB4AGaATQDbALCAXIBXgFKAWgBrgFwA5QCCALgAa4BPgNiAqQBVAEYARgBIgFUAXIBNANYAuoBmgEWAzAChgFUAQQB+gAEAfAADgE2AQID4AGaASADRAJ8ASwB8ADmANwA0gD6APAABAHkArgBAgMmAnwBNgHwANIAtAC+ANIAyADIANwAqAI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "UAA8ACgAKAAoAFAAPABaAGQAWgBkAFoAggAeAEYAKAAoAEYAZACgAKAAyADSAMgA5gD6ABQAKAAoAFAAbgCqAOYALAEYASwBLAE2AUoBFABQAG4AHgBkAL4AyAA2AWgBcgFyAUoBSgEoAHgAoADIAB4AtAAOASwBfAFyAXIBaAFyATwAoADwACIBQAEeAAQBSgGGAXwBhgFoAWgBWgDmADYBXgGGAaQBPADwAHIBaAGkAWgBVAFuAAQBQAFyAXwBmgGkAVAALAFyAZoBcgFoAYwA+gBUAXwBaAGGAa4BpAFuAEABmgGkAXwBggDwADYBVAFeAUoBfAF8AcIBqgBoAaQBmgGWAPoAQAE2ASIBGAFAAV4BmgG4AdIArgHCAZYA5gBAATYBGAEEAfoADgEYAVQBXgHwAK4BoADcAEABIgEEAeYA8ADSAPoADgEYAfoALAE=",
            "opportunities": 207106,
            "raisePct": 58,
            "shovePct": 0,
            "limpPct": 25,
            "rfiPct": 58,
            "completeCells": 169,
            "minimumCellOpportunities": 535
          }
        },
        "30-70": {
          "EP": {
            "n": "MzUAANEjAADFIwAA3SMAABojAACQIQAAsiIAAAMjAACVIgAAbSIAABkiAAD9IQAAiSIAAIpqAADZNQAA7iIAAKwhAABGIgAAnyIAAMghAADTIQAADSIAAGEhAADBIQAACiIAABMiAACLaAAAy2YAACg1AABaIgAAsyIAACUiAABDIgAAVCIAAC0hAADyIAAALSEAAIshAAB+IQAAgGcAAKxlAAC/ZQAAZTUAAEwiAACRIgAAXSIAAIIhAAArIgAAOCEAAB4hAACYIQAAkiEAABloAAAiZAAAoWUAAJJkAAA0NQAAMiMAAPAhAADaIQAAWiEAAAEhAAAQIgAALiIAAFAhAAAkZQAAzWQAAHtkAAAdZAAAJmUAAAQ1AACNIgAA6iEAAAghAADaIAAAQiEAAL8hAAD1IAAABWUAADJkAAARZQAA7WQAAM1lAADKZAAAATUAAGEiAAD0IQAAVCEAALchAAD8IQAAgCEAAHhlAACkYwAAD2UAAMxkAABGZAAALWQAAM9kAABKNAAAACIAAHEhAAB2IQAAsiEAAKgiAAC8YwAAaGMAAL5kAABxZQAAR2QAAKdkAAAfZQAAA2UAAJ0zAAADIgAA0iEAAHkhAAC5IQAARGQAAHxlAABUZAAAY2QAAPJkAADpZAAAJ2UAAARlAACYZAAAYjMAAIchAAClIQAA7CEAAF1lAAAzZAAAomQAAMVjAABRZAAAP2QAAFRkAABVZAAA/mMAABlkAACiMwAA6CEAADMhAAAmZQAAl2UAADhkAAAPZQAAFWQAANlkAAALZQAAEmQAALZjAAASZQAAwmUAAIAyAAAHIQAAo2QAAPdkAABdZAAAI2MAAGFkAADaZAAA0GMAAAllAADZZQAAkWQAAExlAADWZAAAyjIAAA==",
            "r": "1APUA9QD3gPeA9QD1APAA6wDwAOiA44DcAPUA9QD3gPeA9QDjgPuAvQB0gCCAGQAUAA8AN4D1APeA9QDwANSA2wCRgAUAAoACgAKAAoA3gNmA7gB1APKAz4DYgI8AAoACgAAAAAAAADAA0oB0gC+AN4DjgMSAjIACgAKAAAAAAAAAOYAFAAKAAoACgDUA0gDZAAUAAAAAAAAAAAAZAAKAAAAAAAAAAoA3gMMA0YACgAAAAAAAAAeAAAAAAAAAAAAAAAAANQDvAIeAAoAAAAAABQAAAAAAAAAAAAAAAAAAADKAzoCCgAKAAAAFAAAAAAAAAAAAAAAAAAAAAAAogO+AAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAACoDFAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAA6AgoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmgE=",
            "j": "AAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 2867446,
            "raisePct": 21,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 8410
          },
          "MP": {
            "n": "BisAAPobAADIGwAArxsAAD0cAADBGwAAXxsAAMgbAACYGwAA7BoAAO8aAADzGgAAaBoAAJNUAACHKgAA3RoAAIUbAADeGgAA4xoAAAAbAADeGgAAOxoAAPQZAABdGgAAmxkAAPIZAADYUwAAK1IAABcqAAAqGwAAYBsAAE4bAAAWGgAAVRsAAA8aAABFGgAAohkAAF8aAACvGQAAoFIAAOhRAACRUAAAuioAAM0bAADNGgAAExoAAJ4aAACIGgAA0hkAAHEaAADoGQAA4hkAAJBSAABNUAAAxE8AADtQAACwKQAAexoAAJQaAACGGgAAiRoAAOgZAABOGgAAnRkAALAZAADOTwAA800AAFNPAADQTQAAy00AAKcoAACcGgAAkBkAAM0ZAADBGQAASBoAABIaAACKGQAAxk8AAMJOAABeTgAAIE0AAJxOAAB5TgAAFCkAAHEaAADuGQAAbBkAAL0ZAAAeGgAAjhkAABtQAACpTgAAqk4AAFlOAAAmTwAA400AAJZMAABdKAAAUBoAABIaAACCGQAAVBkAADQaAADdTgAA6U0AAA9OAACdTwAAMk0AAO9MAADHTAAAXU0AAEQoAABNGgAAzxkAAGsZAAAfGQAAU08AAJROAAAqTgAAik0AANtNAABtTQAAY00AAFdMAAAtTQAANCcAAFUaAACrGQAANxoAAKFOAAAsTgAAw04AANxOAADLTQAAQ00AAGdNAADdTQAAm00AAOVMAABjKAAADhoAANkZAAALTgAAZk4AAKFOAAAXTgAAkk0AAEhOAAAsTQAA0EwAAK5MAACeTQAAwE0AAKUnAAA4GQAA3E0AAJhOAABITgAAQU4AAONNAAAwTgAAtE0AABlNAABjTQAAv0wAACRMAABKTQAA8yYAAA==",
            "r": "1APUA94D3gPeA9QD1APKA8AD1AO2A7YDogPUA94D3gPeA9QDtgNSA7wC4AFoARgB8AC+AN4D3gPeA94D1AOOA/gCtAAyAB4AFAAKAAoA3gO2AxYD3gPUA44D+AKMABQACgAKAAoACgDUA7ICJgL0AdQDrAOeAm4AFAAKAAAAAAAAABwCMgAUAAoAHgDeA4QDyAAoAAoAAAAAAAAANgEKAAoACgAKAAoA1ANSA4IAFAAKAAAAAABaAAoAAAAAAAAAAAAKANQDIAMyAAoAAAAAACgAAAAAAAAAAAAAAAAAAADUA54CHgAKAAAAKAAAAAAAAAAAAAAAAAAAAAAAtgNoAQoAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAIQDMgAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAwoAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlAI=",
            "j": "AAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 2230027,
            "raisePct": 25,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 25,
            "completeCells": 169,
            "minimumCellOpportunities": 6431
          },
          "HJ": {
            "n": "QCIAANMVAAAwFgAArxUAACcVAAAEFQAA/BQAAMkUAACVFAAAjRUAAHcUAACGFAAAxxQAALVBAABnIAAAEBUAAAoVAACeFAAABxQAAO4TAADHEwAAfhMAANcTAAClEwAA0RMAAJQTAAAaQAAAgD4AAOAfAADeFAAAuhQAAG8UAAAwFAAAfBMAAKQTAABMFAAAyBMAANMTAAA+EwAAdD8AAHk9AAArPQAAHSAAAJEUAABjFAAAJhQAAMUTAACbEwAAUxMAAIQTAACeEwAAmhMAAIU/AADXPAAA7DwAAHk8AABkHgAAlhQAADgTAACBEwAAvhMAAGYTAAAuEwAAXhMAAN8SAABoPgAATDwAAMM6AADpOgAAFzwAAC8eAADDEwAAWRMAAHUTAADnEwAAjBMAAN0SAABzEwAAQD0AAEw7AABjOwAAtTsAAGM6AACaOQAAkh4AAL8TAAAyEwAAxBIAAOUSAABIEwAAHBMAADo9AAA9OwAAcjsAAO46AAAuOgAAKDoAAGY6AAA5HgAAvRMAALUSAABNEwAA+xIAACwTAACgPAAAjTsAAAk7AAC5OgAAIDsAAI86AABsOQAAhDkAAGgdAACWEwAA6hMAAOQSAAAFEwAAMTwAADY7AAAxOwAAOToAAM85AACKOQAAozgAAFI5AACQOQAAAx0AABQTAAASEwAA7hIAABU8AACQOgAAFDsAADk6AACTOgAA8TkAANI5AABwOQAA3zgAAEY4AACAHQAADxMAAIQSAACjOwAABzsAAFc5AAAROwAARDkAAHc5AADWOAAA6zgAAJc4AAAlOQAAUTkAAPEcAAA6EwAA5zsAACM6AACZOgAAuDoAAOI5AADPOAAAuzgAAIA5AAAyOQAAQTkAAP43AADuOAAAPRwAAA==",
            "r": "3gPeA94D3gPeA94D3gPUA9QD1APKA8oDwAPUA94D3gPeA9QDygOYA1ID2gJsAhwC4AGkAd4D3gPeA9QD1APAA2YDMAK0AHgAUAA8ADIA3gPUA6ID1APUA7YDZgPWAVoAKAAeABQAFADeA3ADDAPuAtQDygMqA6QBUAAUAAoACgAKADQDSgFuAFoA0gDeA6wDCAJuABQACgAKAAAAlAI8AB4AHgAUAB4A3gOYA3IBMgAKAAoAAACkARQACgAKAAAACgAUAN4DZgOMAB4ACgAAAJYACgAAAAAAAAAAAAAACgDUAwwDUAAUAAAAoAAKAAAAAAAAAAAAAAAAAAoAygMSAh4ACgBkAAoAAAAAAAAAAAAAAAAAAAAAALYDUAAKAEYAAAAAAAAAAAAAAAAAAAAAAAAAAACOAxQAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1674249,
            "raisePct": 29,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 29,
            "completeCells": 169,
            "minimumCellOpportunities": 4740
          },
          "CO": {
            "n": "fxgAAKgPAABPDwAARQ8AAEoQAACzDgAAxw4AABMPAADXDgAAkQ4AAPgOAACqDgAA/g4AAJsvAAAAFwAA9Q4AALkOAABZDwAAgQ4AAKAOAAD2DgAAoA4AAE0OAAA+DgAA+g0AAMsNAABjLgAAICwAAHAXAACyDgAABg8AAF4OAACvDgAAow0AAGgOAAAFDgAAeg0AAKMNAACdDQAA2C4AAEwsAAB+KwAA9hYAAEgOAAC2DgAAGw4AABoOAABGDgAAEA4AABIOAAChDQAAHw4AAFIuAAA0LAAAACwAAEgrAAChFgAAxw4AABAOAAAnDgAAMw4AAB4OAACvDQAAyg0AAAEOAABULQAANisAANQqAAAOKwAAkCkAAKIVAAB+DgAA8A0AAKkNAACoDQAAYA0AAEcNAACVDQAA1SwAAMsqAACBKgAAXioAAIsqAAD9KQAARxUAADMOAADMDQAA1w0AADkNAADADQAAKw0AAHMtAAC+KgAAbioAAAkqAABpKgAAICoAADEpAAAjFQAAlg0AAB4NAACuDQAAHw0AAHENAAATLAAAaSoAAHwpAAChKQAANygAADopAACcKAAAligAAEUVAABjDQAADQ0AAEgNAABDDQAAfSwAAGYqAADTKQAAQCkAAHYpAAAoKAAAGykAAGooAAB0KAAAOBQAAGkNAACFDQAAhw0AAIgrAABTKgAAzSgAAAwpAABCKQAA+CgAAAspAADuJwAApicAAC0oAAA4FAAABQ0AAFcNAAB7KwAAnykAAGcpAACmKQAAHSkAAGspAABxKAAAuSgAAKMoAACGJwAAgCcAAFgUAAD+DAAAXisAAHEpAABlKQAA9igAAIsoAADEKAAAWygAAAsoAAA4JwAAFCcAAG8nAAB4JwAAghQAAA==",
            "r": "3gPeA94D3gPeA94D3gPeA94D3gPUA9QD1APUA94D3gPeA94D1APKA6wDhANmAz4DFgPuAt4D3gPeA94D3gPUA7YDUgPGAnYCJgL0AcIB3gPeA8oD3gPeA8oDtgMgAyYCmgFAAb4AjADeA7YDmAOOA9QD1AOOA+4C4AGWAFAAMgAyALYD7gJsAjoCTgLUA8oDIAP+AZYAPAAoAB4AjgMIApoBaAEEAV4B1APAA7wCNgFQAB4AHgBIA0ABMgAoAB4AKACCANQDrAP+AYwAMgAUAOQCWgAUAAoACgAKABQARgDUA3oDaAFaACgAAgMyAAoACgAAAAAACgAKACgA1APaAoIAMgCeAigACgAAAAAAAAAAAAAACgAUAMoDGAEyAFgCHgAKAAAAAAAAAAAAAAAAAAAAAADAA1oAEgIeAAoAAAAAAAAAAAAAAAAAAAAAAAAAmAM=",
            "j": "AAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1192888,
            "raisePct": 41,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 41,
            "completeCells": 169,
            "minimumCellOpportunities": 3326
          },
          "BTN": {
            "n": "xBAAAOAKAAA6CgAAbQoAADEKAAAOCgAArgkAALAJAADYCQAA6wkAAIEJAACACQAAqAkAAI0fAABoDwAA6gkAAK8JAACHCQAAOgkAAKAJAAArCQAASAkAAEMJAAAwCQAABQkAADcJAADhHgAA3RwAAJMOAAB0CQAAkAkAAKcJAADPCAAA0wgAAD0JAADxCAAAywgAAPAIAADrCAAAPB4AABkdAACpHAAA1w4AAAMKAABnCQAAXQkAAP0IAAD+CAAAwwgAADwJAAAtCQAAhAgAANMdAAA4HQAAMhwAAIIcAAAbDgAALQkAALsIAADKCAAA6QgAAAcJAADbCAAA3wgAAGsIAAB2HgAA5BsAAM4bAAAmHAAA/xsAANoNAACJCAAAhwgAAKQIAAACCQAAewgAAGwIAACUCAAAhh0AAN8bAADvGwAAyBoAAFIbAADTGgAAug0AAM4IAACiCAAAdwgAANMIAABiCAAAZQgAAFgdAABWGwAAbxsAAPgaAADXGgAAjxoAAEgaAACzDQAAwggAAFIIAABzCAAAaAgAAFEIAAAhHQAAzhoAAJIaAAD3GgAAbBoAALcZAAB3GQAAnxkAAPUMAABhCAAAuAgAAGYIAAAkCAAATx0AANYaAAC8GgAAYhoAAOoZAADnGQAA2hkAAG4ZAAB5GQAAPA0AAGwIAAAqCAAAEAgAAMccAABjGgAA+xoAAJwaAAAfGgAAzxkAAP4ZAABpGAAALxkAADgZAAC/DAAAaggAAEsIAACmHAAA1xoAAK0aAADvGQAAYBoAAHcZAACGGQAAQRkAAMgYAADvGAAA1xgAAJYMAAA8CAAAghwAAEgaAABPGgAAThoAAMgZAABYGQAAchkAAE0ZAAARGQAAPBgAAHgYAAAJGQAA5AwAAA==",
            "r": "3gPUA94D3gPeA94D1APeA94D3gPeA94D3gPUA94D3gPeA94D3gPeA9QDygPAA7YDogOiA9QD3gPUA94D3gPeA9QDwAOsA4QDegNmA0gD1APeA94D1APeA94D1AO2A2YDSAMWAwIDAgPeA9QDygPKA9QD1APUA6IDZgPkAqgCdgJYAtQDogOEA3ADcAPUA9QDrANwA+QCbAJEAv4BygNmAzQDDAPGAgwD1APUA44DIAOoAiYC6gG2AyoDgAJEAv4BEgK8AtQDwANmA9ACOgLWAawD5AIcAoYBSgFUAbgBdgLUA8ADIAOUAvQBtgOeAsIB0gCCAIIAoAAYAeAB1AOEA7ICCAKYA2wCkAGqAFoAUABQAGQAqgBAAcoDDAMSAo4DRAJeAYIARgA8ADIAMgBQAFAAbgDAAxICegMcAkABeAA8ADIAKAAoADIAMgAyADIAtgM=",
            "j": "AAAKAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 764233,
            "raisePct": 63,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 63,
            "completeCells": 169,
            "minimumCellOpportunities": 2064
          },
          "SB": {
            "n": "EAgAADsFAAD+BAAA8wQAAAQFAADABAAAnQQAANIEAACJBAAAaQQAAIUEAACWBAAApAQAAOUOAADvBgAAzQQAALIEAABBBAAAawQAAJ8EAABRBAAARgQAAGIEAAADBAAACgQAADsEAABCDwAAow0AAH0GAAC0BAAAbwQAAGMEAAAYBAAAMAQAAEAEAABQBAAACAQAAAcEAAAtBAAAuQ4AAG4NAABqDQAA+QYAAHIEAABgBAAAIwQAACcEAABcBAAAJwQAAJkEAADpAwAAQgQAAEYOAABlDQAAjw0AAAgNAACvBgAAMgQAADsEAAAdBAAAagQAAGcEAAD0AwAAQwQAACAEAAATDgAAFA0AAPMMAAAkDQAANw0AAEoGAABIBAAAIwQAAOUDAAAxBAAA1gMAAPQDAAATBAAAmg4AAH0NAACKDAAAiQwAABINAABsDAAARAYAAAgEAAANBAAABgQAAPEDAAAfBAAA4gMAAPwNAAD3DAAAqQwAANMMAAC5DAAAfgwAAP4LAAD7BQAA0QMAAPADAADWAwAA5QMAAMYDAAC/DQAAAQ0AAGoMAAAEDAAAJAwAAOULAADxCwAAmAsAAPMFAACxAwAAxgMAANQDAADWAwAA0w0AAAYNAACYDAAAGwwAAJwMAADgCwAA3AsAAMILAACsCwAAnQUAAP4DAADLAwAA2wMAAJgNAACIDAAATwwAACIMAACZCwAAwgsAAO0LAACwCwAAtwsAAFULAAACBgAApAMAAKMDAABaDQAAWgwAAHwMAABEDAAAHwwAAM8LAAC1CwAAjAsAAB4LAABVCwAAMAsAAJcFAACoAwAAZg0AAFMMAABQDAAAPAwAAOILAADECwAAhAsAAGELAAAuCwAAiAsAAE4LAAD/CgAApQUAAA==",
            "r": "cAOOA5gDjgOEA2YDUgM0AzQDNAMgAyADDAOOA4QDjgOEA2YDKgMCA9oC0AKoAqgCdgKKApgDjgOOA0gDSAP4AqgCgAIwAjoCEgL0Af4BmANwAyADmAM0A9ACqAJEAggC/gHgAeoB4AGEAzQD5ALGAoQD5AJYAhIC4AGuAcIBkAGaAUgD2gJsAjACJgJwA54C9AHgAcwBkAFyAXIBKgOAAggC1gGuAbgBZgOKAvQBmgGaAXwBcgEqA0QCpAGQAVQBVAGQATQDWALMAbgBhgFeAQIDMAKGAUoBGAEOATYBXgEMAzACpAF8AVQBAgMcAnwBLAH6APAA+gAOATYBxgL0AXwBcgHkAggCXgEiAeYA0gDSAOYA3AAOAZ4CkAFUAdAC/gFeAQ4B3ADIAL4AyADIANIA0gCAAlQBsgL0AVQBDgHIALQAtACgALQAqgC0ALQARAI=",
            "j": "AAAUAAoAFAAUAAoACgAKAAoACgAKAAoACgAeAAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAAABQAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "l": "bgA8ADwAPABGAG4AggCgAKAAoAC0ALQAyAAyAFAAUABaAHgAtADSAPoABAEiASIBSgE2ATIAUABGAIwAlgDcACwBVAGGAXwBkAGuAZoBMgBkALQAMgCqAAQBLAF8AaQBkAGuAaQBkAFQAKAA5gAOATwA+gByAa4BwgHMAaQB1gGuAYIA5gA2AWgBfAFQADYB1gHMAcIBwgHCAZoBlgAiAXIBpAG4AcwBUABUAcIB6gHMAaQBmgGgADYBkAGQAbgB1gHqAYIAfAHgAcwBwgGaAbQANgFyAXwBkAG4AcwB9AG0AKQBCALgAbgBtAAiAWgBXgFAAV4BkAG4AeoB+gDMAf4B1gHIACwBaAFAATYBGAFKAUoBmgHWASwB/gH0AdIAGAFKASwBDgEEAfoA8AA2AV4BcgFAAeoB5gAOAUABGAEEAdIA3AC+APoA8AAEAfoAfAE=",
            "opportunities": 355780,
            "raisePct": 52,
            "shovePct": 0,
            "limpPct": 29,
            "rfiPct": 52,
            "completeCells": 169,
            "minimumCellOpportunities": 931
          }
        },
        "20-30": {
          "EP": {
            "n": "DREAABcLAAARCwAAPwsAAPIKAAAiCwAAwQoAAAALAADECgAA2woAAO4KAAACCwAAzQoAAKchAAC6EAAAAwsAAAILAADrCgAAmwoAAL4KAABCCwAAVgoAAFEKAAB2CgAAiQoAAMcKAADJIQAAuSAAAGMRAADJCgAADAsAALcKAADgCgAAwQoAAP0KAACWCgAAbwoAAHYKAADZCgAAviAAAPYgAAAPIAAA5RAAAPIKAADACgAADwsAALEKAAB9CgAA4AoAAKEKAAB8CgAAmwoAAJ0gAACaHwAAJyAAAPwfAAAuEQAA2woAAMoKAABBCgAAnAoAAD0KAAAQCwAAdQoAAMMKAADJHwAADCAAAKEfAACcHwAAix8AAAYRAACuCgAAbQoAAJAKAACSCgAA3woAAMwKAACHCgAAnx8AACcgAAAhIAAAfyAAAC0gAACAHwAA0RAAAL8KAADxCgAAjQoAAN4KAADACgAAYgoAAP4fAAByHwAAlCAAAG4fAADmHwAAIx8AAEcgAABfEAAAygoAAKkKAACPCgAAxwoAAKIKAACHHwAA9R8AAP4fAAAWIAAA0B8AALYfAADEHwAAEyAAACIQAADHCgAA3goAAK8KAACeCgAAcB8AAIEfAADRHwAAkh8AACQgAACDHwAASSAAADYgAADbHwAAQhAAAL8KAACbCgAAqwoAANEfAAD0HwAAcR8AAGIgAAAJIAAArh8AAFcgAAD9HwAAMCAAAGEfAADxDwAAugoAAMwKAABsHwAANCAAAPAfAADGHwAASB8AAGUfAABnHwAAQiAAAL0fAADNHwAAAyAAABIQAACPCgAAah8AAPsfAAAyIAAAMB8AAB0gAAA2HwAApR8AAA0gAACbHwAA1h8AAD0gAAA1IAAAeQ8AAA==",
            "r": "wAOYA6wDtgPAA5gDjgNIAwwDSAMCA7wCgAKOA8ADwAPKA5gDxgLWAfAAWgAyACgAHgAUAKIDmAPAA6wDZgNsAkABHgAKAAoACgAAAAAArAO8AgQBogNcAxwCLAEeAAoAAAAAAAAAAABSA6oAZABQAI4DngLcABQACgAAAAoAAAAAAIwACgAKAAoACgCOA/QBKAAKAAoAAAAAAAAAPAAKAAAAAAAAAAAAmAOuAR4AAAAAAAAAAAAeAAAAAAAAAAAAAAAAAIQDQAEKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABSA+YACgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAvAJGAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAP4BCgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABAAQAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgA=",
            "j": "CgA8ADIAKAAUAAoACgAAAAAAAAAAAAoAAABGABQAFAAKAAAAAAAAAAAAAAAAAAAAAAAAADwACgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "FAAKAAAAAAAKAAoAAAAKAAoAAAAKAAoACgAKAAoACgAAAAoACgAKAAAAAAAAAAAAAAAAAAAACgAKAAoACgAKAAAAAAAAAAAAAAAKAAAACgAAAAoACgAKAAoACgAAAAAAAAAAAAAAAAAAAAoAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 907304,
            "raisePct": 17,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 18,
            "completeCells": 169,
            "minimumCellOpportunities": 2621
          },
          "MP": {
            "n": "pA0AAEMJAAARCQAAEgkAAKoIAAAHCQAAgAgAAMsIAABzCAAAcwgAAOEIAAC0CAAAfwgAADAbAAB2DQAACAkAAOEIAACYCAAAewgAAMkIAACfCAAAtAgAAHwIAAAvCAAAbggAAEkIAAD7GgAAERoAAEcNAADACAAAuQgAAFkIAABpCAAADQgAAOUIAAByCAAAUggAAI0IAAB6CAAAqRoAAAcaAABlGQAApw0AAIIIAABJCAAAGAgAAMgIAABbCAAAXwgAAFkIAACICAAANwgAAHcaAACaGQAA2hkAALUZAAApDQAAdQgAAHEIAABMCAAAcAgAAF0IAAApCAAAawgAAEoIAACgGgAAEBkAAEwZAADKGQAAixkAAHYNAACCCAAARwgAAGkIAACWCAAAXwgAAGYIAABPCAAA1xkAAFwZAAArGQAAoBkAALIYAAB0GQAASw0AAKkIAACqCAAANAgAANQHAABVCAAAWggAAO8ZAAAFGQAAWRkAAGkZAACnGQAAthgAAJIYAAAmDQAAjAgAABcIAAB3CAAAFwgAAIUIAAAEGgAAXBkAAFMaAAA/GQAATxkAACAZAADIGAAAmRgAAJQMAACSCAAAOQgAAFwIAACSCAAA3xkAAI0ZAABWGQAAXRkAADcZAACgGQAAaxkAAFwZAADCGAAApQwAAEoIAABnCAAAIggAAH4ZAACpGQAA7BkAAGgZAACxGQAATRkAAIIYAABoGAAA3xgAAEUZAACMDAAAXQgAADgIAAB7GQAAhBkAACcZAAAZGQAAHRkAAIYZAAAvGQAAzBgAAFkYAACjGAAAUBkAAHIMAAAgCAAANhkAAGMZAADkGAAARRkAAJ8YAABFGQAAihkAANcYAADsGAAAAhkAAOYYAADkGAAAXAwAAA==",
            "r": "ygOiA6IDtgPKA6wDogOOA1wDcAM0Az4DAgOOA8oDygPKA6wDPgNsApoB3ACgAHgAZABQAKIDtgPAA8ADjgPkAuABUAAeAAoACgAKAAoArANSAyYCrAOiA6gC1gFGAAoAAAAKAAoAAACOA7gBLAHmAJgDAgNoATIACgAAAAAAAAAAAGgBHgAKAAoAFACEA4ACUAAKAAAAAAAAAAAAtAAKAAoACgAAAAoAjgMmAjwACgAAAAAAAAA8AAAAAAAAAAAAAAAAAI4DuAEUAAoAAAAAAB4AAAAAAAAAAAAAAAAAAAB6A1QBCgAKAAAAKAAAAAAAAAAAAAAAAAAAAAAAFgOCAAoAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAIACFAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAADqAQAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVAE=",
            "j": "CgA8ADwAKAAUABQACgAKAAoAAAAAAAAAAABQAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAADwACgAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "CgAAAAAAAAAAAAAACgAAAAAACgAKAAoAAAAAAAoACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAoAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 719467,
            "raisePct": 20,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 2004
          },
          "HJ": {
            "n": "UgsAAEEHAABSBwAAXgcAAFMHAAAwBwAA5wYAAMoGAAD1BgAA8QYAAH4GAACyBgAAxAYAANsVAADTCgAA7wYAAKIGAADoBgAAzgYAAM4GAADTBgAAmgYAAIoGAADLBgAATgYAAG8GAAChFQAAzxQAAIwKAAC9BgAAxwYAAGoGAABuBgAAiAYAAHcGAABhBgAAUQYAAMgGAACZBgAA9RQAAMcUAADUFAAA7woAAFkGAAAgBwAAmQYAAKsGAABgBgAAfwYAAMcGAACvBgAAlAYAAMQUAAD0EwAAcBQAACoUAABzCgAAlAYAAIsGAACJBgAAnAYAAKcGAACZBgAAggYAAD8GAAB4FAAA3xMAAPsTAABtEwAAQhMAAF8KAACZBgAAgwYAAIQGAABbBgAAsgYAAHAGAABnBgAA3BQAAH0TAADpEwAAvBMAAMgTAAB+EwAAvAkAAFkGAABoBgAAYQYAAKsGAABdBgAAXwYAAKgUAACfEwAAQxQAAAoUAADIEwAAUhMAALITAAD0CQAAaQYAAJgGAABDBgAArgYAAFEGAAB4FAAADhQAAGwTAAChEwAAARQAAM0TAACsEwAAiBMAAEMKAABIBgAAWAYAAKoGAABrBgAA7hMAANUTAAB5EwAAhxMAAHETAABMEwAAOBMAAOQSAADgEgAApAkAAJIGAAAZBgAALwYAALoTAACpEwAA+BMAAIYTAABwEwAAVxMAAEwTAABvEwAAyBMAAIETAACaCQAAPgYAADMGAADKEwAAKhMAACsUAAC7EwAANRMAAJETAAAsEwAA1xIAADUTAAAgEwAAxxIAAI8JAABaBgAAmBQAAPATAACSEwAAVBMAAMsTAAC5EwAAfRMAAPgSAACFEwAA6hIAAMgSAABdEwAAzgkAAA==",
            "r": "ygOYA6wDtgPAA7YDwAOsA5gDrANwA3oDUgOOA8oDygPKA8ADhAMMA4ACzAF8ASwBDgHIAJgDygPKA8oDwANIA54CNgFuAEYAKAAoAB4AtgOiAwwDtgOsA0gDigLwADIAHgAUAAoACgC2A7wCRALqAY4DZgMcArQAKAAKAAoACgAKAKgCqgA8ACgAWgCOA+QCGAE8AAoAAAAAAAAAzAEoABQAFAAKABQAjgOyAqoAHgAKAAoAAADwABQAAAAKAAoACgAKAI4DTgJGAAoACgAAAG4ACgAKAAAAAAAAAAAACgCEA8wBKAAKAAoAeAAKAAAAAAAAAAAAAAAAAAoAUgP6ABQACgBGAAAAAAAAAAAAAAAAAAAAAAAAAPgCKAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAACoAgoAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAI=",
            "j": "CgA8ADIAKAAeABQACgAKAAoACgAKAAAAAABQAAoAFAAUAAoAAAAAAAAAAAAAAAAAAAAAAEYACgAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAKAAKAAAAKAAKAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "CgAAAAAAAAAAAAAAAAAKAAoAAAAKAAoACgAAAAoAAAAAAAAACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAoACgAKAAAAAAAAAAAAAAAAAAoAAAAKAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 560351,
            "raisePct": 24,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 25,
            "completeCells": 169,
            "minimumCellOpportunities": 1561
          },
          "CO": {
            "n": "EwkAAJcFAACqBQAAPQUAAKAFAABHBQAAXgUAADwFAAAvBQAAIwUAAIQFAABTBQAAKgUAAE0RAABWCAAAcAUAAGUFAABkBQAAaAUAADkFAADsBAAA+gQAABcFAADvBAAA8wQAAAwFAAAeEQAA+Q8AAEcIAABbBQAAIgUAAEAFAAA6BQAA+AQAAPwEAAApBQAABAUAAAcFAAAABQAAqxAAAAAQAADWDwAAQwgAAAMFAABDBQAAMgUAAN0EAABQBQAA0gQAAAUFAADeBAAA9QQAAHcQAACeDwAAtQ8AAK4PAAAyCAAADQUAABMFAAASBQAA2QQAADQFAADgBAAAwQQAACkFAADhDwAAXQ8AAB0PAABVDwAA/g4AAK8HAAD+BAAA3wQAAMYEAAANBQAADAUAALwEAADdBAAAQRAAAEAPAABaDwAAKA8AAD0PAAAPDwAAvwcAAOsEAAD+BAAA/gQAAOsEAAD3BAAA8wQAACcQAABeDwAAFA8AAO8OAADWDgAA0g4AAIgOAADtBwAA8wQAAMYEAADfBAAAmwQAALkEAADgDwAArw4AANUOAABaDwAADw8AAI8OAACEDgAAtQ4AAKkHAADKBAAAygQAAMAEAADXBAAAChAAABoPAAAFDwAAKg8AAPwOAACODgAAYA4AAFcOAABtDgAAWAcAAL0EAAClBAAA2gQAAOIPAABODwAABw8AACAPAAAbDwAAuA4AAI8OAAB7DgAALQ4AAGsOAACFBwAA0gQAALQEAAAHEAAAJw8AAMYOAADKDgAAHA8AAL8OAAAuDgAAXg4AAHAOAACXDgAA+g0AAEQHAADLBAAAhw8AAL0PAADPDgAA6Q4AANwOAACpDgAAng4AAHkOAAAFDgAAHA4AAO4NAAAkDgAAHgcAAA==",
            "r": "ygOsA7YDrAO2A7YDwAPAA7YDwAO2A6wDogOOA9QDwAPKA8oDrAOOA1wD+ALGAmwCWAIIApgDwAPKA8ADygOiA1wDigLWAZoBSgH6APAAogPAA44DogO2A5gDSANOAkAByACMAGQARgCsA3ADIAMMA4QDmAP4AhICBAFQACgAKAAeAHADJgKGAUoBXgFwA3ADJgIOAVAAKAAUABQANAM2AdIAqgBuAKoAegMqA8wBjAAyABQAFADGAqoAKAAeABQAFABGAHoDAgMOAUYAHgAUADACMgAUAAoACgAKABQAKABmA54CoAAoABQARAIoAAoACgAAAAAACgAKABQAXAPgATwAHgDgAR4ACgAAAAAAAAAAAAAACgAKAD4DjAAUAJABFAAKAAAAAAAAAAAAAAAAAAoAAAAqAygASgEeAAoAAAAAAAAAAAAAAAAAAAAAAAAAxgI=",
            "j": "CgAyACgAPAAoACgAFAAUABQAFAAUAAoACgBQAAoAHgAUAAoACgAAAAAAAAAAAAAAAAAAAEYAFAAUABQACgAAAAoAAAAAAAoAAAAAAAAAPAAKAAoAPAAUAAoAAAAAAAAAAAAAAAAAAAAoAAoACgAAAFoACgAAAAAAAAAAAAAAAAAAAB4ACgAAAAAAAABuAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAZAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAGQAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABkAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAWgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAEYAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAA=",
            "l": "CgAAAAAAAAAAAAAACgAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 428304,
            "raisePct": 34,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 35,
            "completeCells": 169,
            "minimumCellOpportunities": 1179
          },
          "BTN": {
            "n": "wAYAAEEEAABhBAAALwQAADoEAAAOBAAAEAQAAPwDAADGAwAA9gMAANQDAACkAwAA6gMAAOQMAACABgAA0gMAAPIDAAAOBAAApQMAAOgDAADOAwAAvQMAAL4DAAC7AwAApQMAAGwDAAA6DQAAowsAAOoFAADyAwAAuwMAANYDAADXAwAAiAMAAJoDAAC2AwAAsQMAAKQDAADXAwAArgwAAJkLAACuCwAA9QUAALADAACsAwAAsQMAALADAACTAwAAvwMAAJUDAACVAwAAcgMAANIMAAC3CwAAawsAAAULAADpBQAAzgMAAHADAAC3AwAAvAMAAIcDAAB/AwAAcAMAAGADAADTCwAAAAsAAIsLAAAUCwAAIwsAAG4FAACEAwAAkAMAAHADAACPAwAAkAMAAIIDAAB0AwAAHQwAAFoLAAAcCwAAGAsAALgKAAC7CgAAZgUAAFgDAAB5AwAAhwMAAHwDAACWAwAAbAMAAM0LAABYCwAA7AoAALkKAAB9CgAAMAoAAAQLAAB6BQAAZwMAAIEDAABIAwAAmAMAAEEDAACUCwAAMwsAANYKAACzCgAAiAoAAA8KAACdCgAAOQoAAGkFAABUAwAArAMAAEYDAABKAwAAtQsAACkLAACiCgAAfwoAABwLAABLCgAAXgoAAEEKAAD0CQAARwUAAIcDAABxAwAAMwMAALYLAADUCgAArwoAANQKAACACgAAWAoAACYKAAABCgAAnAoAAP8JAAAdBQAAKgMAAGMDAADxCwAA8AoAAJoKAACPCgAAfQoAAAsKAAANCgAASwoAAAEKAABdCgAA6wkAADsFAABaAwAAwwsAAIIKAAA7CgAArQoAAKoKAAAUCgAAMAoAAM8JAAA0CgAANwoAANYJAADJCQAAIAUAAA==",
            "r": "ygOOA5gDjgOYA44DjgOiA6IDmAOiA6IDjgOEA8oDrAOsA7YDrAO2A6IDjgOEA3oDUgNSA4QDrAPAA7YDtgPAA6wDhAM+AyAD5ALkAsYCjgOsA7YDogPAA6wDrANmA+QCsgJsAkQCMAJ6A7YDmAOOA3ADrAOOAz4DvAIcAswBwgF8AY4DXAMqA+4C2gJSA7YDPgPaAhwCkAFoATYBhAP4ApQCWAL0AU4CSAOYAyADWAK4ATYBNgF6A6gCwgGGATYBSgH0ASADhAOeAv4BaAEYAVwDJgJKAeYAvgDIAPAAhgE0AzQDWAKuASIBXAPgARgBjABGAFAAWgCgACIBIAPuAswBLAE+A7gB+gBuADwAMgAyADwAZAC0ACADCAJKASoDhgHSAFAAMgAoACgAKAAoADIARgAgA1QB+AJoAb4ARgAyAB4AKAAUABQAHgAeAB4AAgM=",
            "j": "CgBQAEYAUABGAFAARgA8ADwARgA8ADwAMgBaABQAMgAyACgAHgAKABQACgAKAAoACgAKAFoAMgAeACgAHgAKAAoAAAAAAAAAAAAKAAoAUAAoABQAPAAUABQACgAAAAAAAAAAAAAACgBkABQACgAKAG4AFAAAAAoAAAAAAAAAAAAAADwAFAAAAAAAAACWAAoACgAAAAAAAAAAAAAAPAAKAAAAAAAAAAAAlgAKAAAAAAAAAAAAAAAyAAoAAAAAAAAAAAAAAL4ACgAAAAAAAAAAADIACgAAAAAAAAAAAAAAAACgAAoAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAqgAAAAAAAAAoAAoAAAAAAAAAAAAAAAAAAAAAAKAACgAAAB4ACgAAAAAAAAAAAAAAAAAAAAAAAACMAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAggA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAoAAAAAAAAACgAKAAAACgAKAAAACgAAAAAAAAAAAAAACgAKAAAACgAKAAoACgAAAAAAAAAKAAoAAAAAAAoAAAAKAAoAAAAKAAAAAAAAAAAACgAAAAAACgAKAAoACgAAAAoAAAAAAAAAAAAKAAoAAAAAAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAoAAAAAAAAAAAAAAAAACgAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 308544,
            "raisePct": 53,
            "shovePct": 2,
            "limpPct": 0,
            "rfiPct": 55,
            "completeCells": 169,
            "minimumCellOpportunities": 810
          },
          "SB": {
            "n": "LAQAAJICAACNAgAAqAIAAGcCAACIAgAAWQIAAF0CAABvAgAARAIAAC0CAABOAgAANAIAAKoHAACVAwAAWgIAAEoCAAA8AgAAIQIAADQCAAA6AgAAJAIAADMCAAA5AgAAAgIAAC0CAAD9BwAACwcAAHUDAAAuAgAAHgIAAFYCAAA5AgAABAIAABwCAAAzAgAA/AEAABwCAAA8AgAASQcAAOMGAADLBgAAgwMAAEoCAAAOAgAAPAIAABECAABAAgAACQIAAPgBAAD9AQAADQIAAHIHAAAQBwAAwwYAAKIGAABhAwAADwIAACwCAAD1AQAAEAIAAAwCAAAYAgAAOgIAAAQCAABqBwAAJQcAAK0GAADUBgAAmAYAACoDAAAqAgAAJwIAAPYBAAADAgAA/AEAAOQBAADtAQAAOwcAAJcGAACnBgAATAYAAGQGAACIBgAAHAMAAA4CAAANAgAADgIAAAMCAAAaAgAA9gEAAGIHAADGBgAAUAYAADMGAABSBgAAHQYAAAoGAAARAwAA+wEAAAgCAAACAgAA9gEAAMYBAAADBwAApwYAAB4GAABUBgAANwYAAAgGAADXBQAA9AUAACQDAAAIAgAA+gEAAOMBAAAaAgAAwwYAAJEGAABuBgAApAYAACIGAAAkBgAA6AUAAOYFAAAfBgAA3AIAAAUCAAAGAgAA/AEAAO8GAABjBgAAgQYAAAcGAAARBgAAGwYAABsGAADFBQAAiwUAAHkFAADuAgAA5QEAAAQCAAD3BgAANQYAAO0FAAAgBgAAHwYAADAGAAD5BQAA0wUAAOcFAACSBQAAtwUAAMgCAADfAQAAKAcAAJgGAAApBgAAIwYAAAYGAADgBQAA2QUAAOMFAAC+BQAAkAUAAAYGAACfBQAA2AIAAA==",
            "r": "FgPuAtAC2gKoAmICTgIwAmwCWAJOAjoCRALkAj4D+ALGAooCdgJYAjACEgLgAf4B/gHgAdAC0AJSA6gCbAIwAjACzAG4AbgBpAGQAXwBqAKoAoACKgNEAkQC4AHMAYYBcgF8AUoBXgF2AnYCWAImAtoC/gGuAZABfAFoAUoBIgEYAToCJgLqAa4BhgGAAiYChgFoAUoBNgEsAfAAMAL+AZoBfAEsAVQBMALCAV4BNgEYARgB5gA6AswBXgE2AQQBDgEsAeABuAFyARgBSgEEATAC1gEsAQQB5gDSAPAABAG4AYYBNgEiAQ4BJgLCASwBBAG+AMgAvgDIAA4BkAFyAQ4BGAESAq4BDgHmAKoAqgC0AKAAtAC0AGgBNgEEARwCkAEYAfAAoAC+ALQAtACMAKoAqgBKASwB6gGGAfoA3AC0AKoAjACMAKAAlgCMAJYASgE=",
            "j": "FACMAIwAoACqANIAyAC+AIwAtACCAKoAjACWABQAbgBuAG4AUABGADwAMgA8ACgAKAAyAKoAggAyAEYAUABQADIACgAUABQACgAeABQAvgBuAEYAUABaACgAHgAKAAoACgAKABQACgDmAFAAMgAoAKAARgAoAAoAAAAKAAoAAAAAANIAMgAUAAoAFADwAB4AHgAKAAAAAAAAAAAA0gAeABQACgAAAAoAIgEUAAoACgAAAAAAAAC+AB4ACgAKAAAAAAAKAFQBFAAKAAoAAAAKAJYAFAAKAAAAAAAKAAAAAABUAQoAAAAKAAoAoAAeAAoAAAAAAAAAAAAAAAAANgEKAAAAAACWABQACgAAAAAAAAAAAAAAAAAAADYBCgAKAJYAFAAAAAAAAAAAAAAAAAAAAAAAAAA2AQoAjAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAA+gA=",
            "l": "tABkAIIAZACMAKoAyADmANwA0gAEAfoADgFkAIwAggC0AOYAGAE2AXIBhgGkAZoBhgGaAWQAjABkAPAAIgFeAWgB9AHqAdYB9AHWAfQBeAC+ABgBZABAAWgB1gHgAf4B/gH+ARIC6gGCAA4BNgFyAWQAkAH+AQgCEgLqAfQBEgL+AcgAVAGaAdYB9AFuAJABHAIwAhwC/gHgAcIByAB8AcIB4AH+ARwClgD0AUQCOgIIAswB4AHSAHwBrgGuAdYB/gEmAqAA9AE6AjoCwgGaAfoAaAGaAXwBfAG4AdYBJgLSADoCRAL0AeAB+gBKAYYBQAFAASwBaAGuAfQBDgFEAiYC4AEEAVQBcgE2AfoA8AAOAUoBXgHgATYBMAL0AfoASgFeASwB8ADIANwAyAAOATYBNgFUAfQBIgFKAVQBGAHIAL4AqgCqAL4A3ADSAOYAkAE=",
            "opportunities": 180684,
            "raisePct": 40,
            "shovePct": 5,
            "limpPct": 33,
            "rfiPct": 45,
            "completeCells": 169,
            "minimumCellOpportunities": 454
          }
        },
        "15-20": {
          "EP": {
            "n": "QggAAFQFAABvBQAAOgUAAGIFAABLBQAAMwUAAG0FAAA5BQAAaQUAAF0FAAAZBQAALgUAADkQAAA8CAAAEwUAAOkEAABFBQAAGwUAAB8FAABvBQAACgUAAFAFAAAwBQAAGwUAAEQFAAAQEAAAZxAAAHQIAAB+BQAAYAUAAPgEAAAeBQAAyAQAAB8FAAAABQAAPwUAABYFAAA6BQAACBAAAP0PAADoDgAAbQgAAAYFAAAWBQAAHwUAACQFAAAkBQAAcQUAAEEFAABGBQAACwUAAEIPAABhDwAAWQ8AAOAOAAAkCAAAZAUAAD8FAAAuBQAAIAUAAE0FAAD/BAAALgUAACsFAAB7DwAAGg8AAGcPAABYDwAAkg8AAOsHAABEBQAAQwUAAAgFAADjBAAAHQUAABQFAADkBAAAcA8AAHMPAADsDwAAoQ8AAMIPAABzDwAA8AcAAEsFAAALBQAAZQUAADsFAABkBQAA7AQAABsPAABWDwAAHhAAAEMPAABSDwAAew8AALAPAAAMCAAA+AQAACQFAADiBAAA+AQAABEFAAC3DwAA4A8AAJEPAABUDwAAxw8AAGEPAAAGDwAAXw8AAOQHAAAUBQAAyAQAAP0EAAARBQAAuw8AAH0PAACIDwAA+Q4AAOUOAAANDwAAZg8AAGAPAAB3DwAA1QcAAAIFAABTBQAAvAQAAAgPAABwDwAA0w8AAFAPAACADwAADQ8AAEUPAAC6DwAAQg8AAEYPAAAZCAAAKQUAAP4EAACWDwAA5A4AAGcPAACxDwAAVg8AAGsPAACODwAATw8AADsPAABnDwAA3g8AAJ8HAAA/BQAANA8AABsQAADfDwAAkw8AADQPAACMDwAAiA8AAIoPAABwDwAAnw8AAMsPAAB6DwAAzAcAAA==",
            "r": "hAOyAqgCxgLkAtoClAJiAhICOgL+AcwBhgF2AmYDAgM+A+QCzAHcAGQAKAAUABQAFAAKAGwC5AI0AwIDgAJKAYwACgAKAAAAAAAAAAAAxgLCAYIAsgKeAiIBbgAKAAAAAAAAAAAAAABsAloAKAAeAEQChgFuAAoAAAAAAAAAAAAAAFAACgAAAAAAAAAwAvoAFAAKAAAAAAAAAAAAHgAAAAAAAAAAAAAARAK+AAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAAADoCjAAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAIAloAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAXgEeAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAPoAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAACMAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAA=",
            "j": "PAAiASIBGAHSAG4AUAA8ADIAPAAeABQAHgBeAWQAvgBkADwAFAAKAAoAAAAAAAAAAAAAAGgBWgCgAEYAKAAKAAAAAAAAAAAAAAAAAAAA8AAeAAoAIgEoAAoAAAAAAAAAAAAAAAAAAAB4AAoAAAAAAIYBCgAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAACaAQAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAcgEKAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAADYBCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "l": "HgAKAAoAAAAKAAoACgAUAAoAFAAUAAoAFAAKABQACgAKABQACgAKAAoAAAAAAAAAAAAAAAoACgAKABQAFAAKAAoAAAAAAAAAAAAAAAAACgAKAAAACgAUAAoACgAAAAAAAAAAAAAAAAAKAAAACgAKABQAFAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 438863,
            "raisePct": 12,
            "shovePct": 3,
            "limpPct": 0,
            "rfiPct": 15,
            "completeCells": 169,
            "minimumCellOpportunities": 1212
          },
          "MP": {
            "n": "lAYAAGkEAACIBAAAeAQAAEwEAAA9BAAASQQAABQEAABeBAAAgAQAACoEAAAzBAAARwQAABANAACnBgAAZwQAADIEAAAfBAAA4wMAACIEAABFBAAAIQQAAAIEAAAFBAAA8gMAAAcEAACNDAAAXgwAAHYGAAAoBAAAEgQAAB4EAAAyBAAACAQAAAsEAAAIBAAA/gMAAAMEAAD4AwAAhwwAAEoMAAA3DAAAFAYAADsEAAAsBAAACwQAABsEAAABBAAA+QMAAOwDAABXBAAAEAQAALAMAABkDAAAKgwAAEAMAABCBgAAGQQAAAYEAABBBAAA0QMAAPEDAAAFBAAAEAQAAAMEAAAZDAAAIwwAACEMAADpCwAA5AsAACwGAADpAwAAAwQAABMEAAAFBAAA6wMAAPgDAAAzBAAAcQwAAD4MAAANDAAALAwAALMLAADqCwAAHAYAAOEDAACpAwAACgQAABkEAAACBAAABQQAAN8LAABaDAAAiwwAABsMAABxDAAACAwAAOMLAABNBgAAHQQAAOsDAAD9AwAAywMAABEEAAB+DAAA8gsAABQMAADhCwAAOwwAAIULAACzCwAA4gsAAC0GAAAeBAAAKwQAAOsDAAAYBAAAVAwAAAYMAAAuDAAAiQsAACQMAAA2DAAA5gsAAOILAAAoDAAAFgYAABsEAAD2AwAACAQAAEIMAAAcDAAAawwAABEMAABCDAAAzwsAAPULAAA7DAAA3wsAACoMAADqBQAAFQQAAPYDAABqDAAAiwwAAHcMAADtCwAAwgsAAA8MAAAGDAAAvAsAAOALAADvCwAAtwsAANkFAAD7AwAA/AsAANsLAAAdDAAAJwwAAFgMAADzCwAASwwAAMoLAAD8CwAA1gsAAPcLAAAjDAAARAYAAA==",
            "r": "hAOeAqgCvAL4AgID0AKKAlgCngI6AhwC6gF2AnADKgNSAxYDTgJUAcgAWgAyACgAHgAUAHYCFgM0AyoD5ALCAeYAKAAKAAoACgAAAAAAvAJOAjYBvALkAoYB0gAeAAoAAAAAAAAAAACeAtwAggBkAEQC/gGWAB4ACgAAAAAAAAAAANIAFAAKAAoACgAwAl4BKAAUAAAAAAAAAAAAWgAKAAAAAAAAAAAAMAL6AB4ACgAAAAAAAAAoAAAAAAAAAAAAAAAAAEQC3AAUAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAIApYACgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAwgE8AAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAEoBCgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlgA=",
            "j": "PAA2ASwBDgHSAIwAggBaAFAAPAA8ACgAHgBeAVoAqgBuAEYAFAAKAAoACgAKAAAAAAAAAF4BbgCgAFAAHgAUAAoAAAAAAAAAAAAAAAAADgEyAAoAGAEyAAoACgAAAAAAAAAAAAAAAACqAAoAAAAKAJABHgAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAACkAQAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAmgEKAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAFQBCgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2AQAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAA0gAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAIIAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAA=",
            "l": "FAAKAAoACgAKAAoACgAUAAoACgAUAAoAFAAKABQAAAAKAAoACgAKAAAAAAAAAAoAAAAAAAoACgAKABQAFAAKAAoACgAAAAAAAAAAAAAACgAKAAoACgAUAAoAAAAKAAAAAAAAAAAAAAAKAAAACgAAAAoAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 344099,
            "raisePct": 14,
            "shovePct": 4,
            "limpPct": 0,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 937
          },
          "HJ": {
            "n": "dQUAAIMDAABRAwAAgAMAAHoDAAB2AwAAPQMAAEsDAABWAwAALwMAACkDAABDAwAAUQMAADQKAAACBQAAUAMAAGUDAABTAwAAOwMAACkDAAD+AgAAHgMAAAYDAAAoAwAA+AIAABIDAABdCgAAJQoAACcFAAAkAwAAVwMAABIDAABCAwAAEgMAAC8DAAAdAwAANAMAABsDAAAtAwAAqQoAAA0KAACwCQAABwUAABYDAAD3AgAAYgMAACIDAAAgAwAALgMAAAgDAAAoAwAAQgMAAMEJAABoCQAAgAkAAIEJAAD0BAAATwMAAEgDAAAkAwAASgMAAPsCAAAfAwAA9gIAABEDAADmCQAAoAkAAJEJAAB3CQAAbgkAAPwEAAD2AgAACgMAAO0CAAAeAwAABQMAABEDAADlAgAAqgkAAGsJAABpCQAAnwkAAJsJAACwCQAAlQQAAPoCAAA3AwAAJAMAAA4DAADqAgAA4AIAAKAJAACdCQAAIwkAAFQJAABZCQAAngkAAAAJAACQBAAAHwMAAAQDAAAJAwAAIAMAABgDAADMCQAAbAkAAHAJAAA6CQAACwkAAEQJAADeCAAAFwkAALoEAAAcAwAA5AIAAMcCAADHAgAATwkAAFwJAAB3CQAAUAkAAAMJAAAGCQAAMgkAABEJAAAcCQAA2AQAAC8DAADyAgAADQMAAKcJAAB+CQAAPgkAAAgJAAAqCQAA/wgAAOwIAABNCQAA+wgAAD8JAACABAAA5AIAAP0CAADCCQAAPgkAAFIJAAAICQAAQwkAAC4JAAANCQAAUAkAAFMJAAAnCQAAGwkAAIoEAADrAgAAXAkAAGAJAAAGCQAASQkAACAJAAAhCQAA4QgAAO8IAADVCAAAVQkAAAwJAADSCAAAqwQAAA==",
            "r": "rAPGAqgCsgLGAtoC5AKyAqgCxgKUAoACWAJiAnoDDAM0AzQDngL0AUoB5gCgAJYAbgBuAE4CAgMgAz4DFgNOApABggAyABQAFAAUABQAlALaAggCxgIWAxwCXgF4AB4ACgAKAAAAAAC8AswBQAH6AFgCRAIEAVoAFAAKAAoAAAAAAKQBUAAeABQAKAASAuABWgAeAAoAAAAKAAAABAEUAAoACgAKAAoAEgKGAVAACgAAAAAAAACMAAoAAAAAAAAAAAAKABICNgEeAAoAAAAAADwAAAAAAAAAAAAAAAAAAAAwAuYAFAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAA/gFkAAoAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAKQBFAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAABKAQoAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAE=",
            "j": "KAAOASwBIgEOAcgAtACgAG4AbgBQAEYARgByAVoAyACMAFoAKAAeAAoACgAAAAAACgAKAIYBoAC0AG4AUAAUABQACgAAAAAAAAAAAAAAQAFaACgADgFGABQACgAAAAAAAAAAAAAAAADcABQACgAKAHIBKAAKAAAAAAAAAAAAAAAAAG4AAAAKAAAAAADCAQoAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAuAEUAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAJoBCgAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAByAQAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAADgEAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAC0AAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAA=",
            "l": "CgAKAAoACgAAABQAAAAKAAoAFAAUAAoAFAAKAAoACgAKAAoAFAAKAAAAAAAKAAAAAAAAAAAACgAKABQACgAKAAoAAAAAAAAAAAAAAAAAAAAKAAoACgAUABQACgAKAAoAAAAAAAAAAAAAAAAACgAAAAoAHgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAHgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 265547,
            "raisePct": 17,
            "shovePct": 4,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 711
          },
          "CO": {
            "n": "JAQAAJICAACsAgAAugIAAHgCAAB7AgAAYwIAAJUCAACSAgAAjQIAAIECAABiAgAAggIAAG0IAAAvBAAAtgIAAMQCAABzAgAAawIAAHECAABMAgAAdAIAAGMCAACcAgAAUgIAADkCAAD3BwAAiAcAAPEDAABzAgAApQIAAGMCAABxAgAAYQIAAFsCAAB0AgAAdwIAAGYCAAB4AgAA4AcAAJAHAABUBwAAsgMAAJYCAAB8AgAAcgIAAIQCAABhAgAAZgIAAHUCAABJAgAAYQIAAOgHAABHBwAAaAcAAEsHAADxAwAAfQIAAGICAABYAgAAZwIAAGECAAB8AgAAegIAADMCAACkBwAAeQcAAPcGAABkBwAALwcAAMADAABoAgAAdwIAAFYCAAAsAgAAVgIAADsCAAAvAgAA2gcAADEHAAD4BgAAGwcAABMHAADuBgAAogMAAGMCAABKAgAAMwIAAE0CAABiAgAAagIAAL8HAACPBwAAFQcAADIHAABLBwAA/QYAABEHAACpAwAARgIAAEwCAAAwAgAAagIAAG0CAACzBwAAYAcAAH8HAABvBwAADQcAAMYGAADxBgAA+gYAAK4DAABFAgAAaQIAAFECAABWAgAAcQcAAGoHAAAlBwAARgcAAOQGAAAuBwAA7gYAAPQGAADXBgAAmgMAAG4CAAA5AgAALgIAAM0HAAAtBwAA8QYAADIHAAAoBwAAxAYAAK8GAADvBgAA4QYAAAEHAAB/AwAARgIAAEICAAA+BwAADgcAACYHAADxBgAA6gYAAPsGAAAfBwAAEQcAAP0GAAD8BgAAqAYAAFMDAABIAgAA2wcAAHYHAAABBwAAAgcAAAoHAADvBgAArgYAAKYGAADXBgAAfgYAALsGAAC8BgAAjAMAAA==",
            "r": "rAPGArwCqAKeApQCxgLQAtoCxgLQAu4CxgKKAnoD7gICAwIDDAOoAmIC4AHCAXwBSgFKAWwC7gJSAwwDKgP4AooCfAH6AMgAtACCAG4AYgL4AtAC0AIMA7wCRAJKAaoAZAA8ADIAMgCKApQCJgL0AWwCngLCARgBZAAoABQACgAUAE4CSgHIAJYAtAAIAoACIgGCADIAFAAUABQAHAKgAG4AWgAyAEYA6gEcAgQBPAAeAAoACgCuAVoAFAAUAAoACgAoAOoB9AGCABQAFAAKAEoBKAAKAAoACgAKAAoAHgDMAYYBPAAUAAoAXgEUAAoAAAAKAAAACgAKAAoA6gEYARQACgAEARQACgAKAAAAAAAAAAAAAAAKAMIBRgAKAPoAFAAKAAAAAAAAAAAAAAAAAAAAAACaARQAyAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAhgE=",
            "j": "KAAOASIBNgFAASIBBAHmAL4A0gCWAIIAeABUAVoA8ADIALQAWgA8ACgAKAAUABQAFAAKAHIB3ACCALQAbgAyACgACgAUAAoAAAAKAAAAfAGMAEYABAF4ACgAFAAKAAoAAAAAAAAAAABKAUYAKAAUAHIBUAAUAAAACgAAAAAAAAAAAOYAFAAKAAoAAADMARQACgAAAAAAAAAAAAAAtAAKAAAAAAAKAAAA9AEUAAAACgAAAAAAAACMAAoAAAAAAAAAAAAAANYBCgAAAAAAAAAAAFoAAAAAAAAAAAAAAAAAAADgARQACgAAAAAAWgAAAAAAAAAAAAAAAAAAAAAApAEAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAHIBAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAABKAQAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0gA=",
            "l": "CgAKAAAAAAAAAAoAAAAAAAoACgAKAAoACgAAAAoAAAAKAAoACgAKAAAAAAAAAAoACgAAAAAACgAKAAoAFAAKAAoACgAKAAAAAAAAAAoAAAAKAAoACgAUABQAFAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAFAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "opportunities": 203883,
            "raisePct": 23,
            "shovePct": 6,
            "limpPct": 0,
            "rfiPct": 29,
            "completeCells": 169,
            "minimumCellOpportunities": 556
          },
          "BTN": {
            "n": "cAMAAA8CAAAbAgAAJQIAAB8CAAAKAgAABgIAAAUCAAD1AQAAEQIAAPcBAAD3AQAA/QEAAHwGAADhAgAAIQIAANoBAADsAQAA7QEAAAUCAADjAQAA9QEAAO8BAADNAQAAHQIAANABAABPBgAALAYAAAgDAAAcAgAA1gEAANYBAADkAQAAxgEAAN0BAADHAQAArgEAAMIBAADhAQAATgYAAEQGAACUBQAABQMAAPsBAADQAQAAywEAAPABAAD0AQAA6wEAAMIBAADRAQAAtwEAAJEGAADkBQAAlQUAAKsFAAATAwAA0QEAAOMBAAD+AQAA8AEAANIBAADYAQAA1gEAAMYBAAAeBgAAxwUAAKgFAACXBQAAkQUAANsCAADnAQAA5gEAANEBAADqAQAAygEAALIBAADNAQAAGAYAAD8FAACPBQAAoAUAAMMFAACNBQAAyAIAALoBAAC+AQAArgEAAMwBAADbAQAA2wEAALYFAACjBQAAiwUAAJ4FAABABQAAagUAADAFAADVAgAAtgEAALEBAACOAQAAwwEAAKsBAADqBQAAxgUAAI4FAAB9BQAAnAUAAKQFAAAyBQAAHgUAAMoCAADEAQAAmwEAAKUBAADDAQAAwQUAAIEFAAA8BQAAbQUAAIsFAAAvBQAA/wQAABkFAAAEBQAAsAIAAJwBAADLAQAArAEAACQGAACeBQAAcwUAADsFAABlBQAAQgUAAFIFAACQBQAAPgUAAB0FAACnAgAAmwEAAJABAADdBQAAqQUAAGcFAACuBQAAJQUAABsFAABcBQAAWgUAAAIFAAApBQAAAQUAAH0CAACcAQAAywUAAHsFAACNBQAAfAUAADcFAAA/BQAA7gQAAE4FAAAiBQAA5wQAACcFAAACBQAAigIAAA==",
            "r": "ogPaAqgCgAJiAkQCTgJiAmwCgAJYAooCgAKKAo4DsgLGArIC0ALGAu4C5AKoAnYCbAJiAk4CqAJcA+4C+AIMAyADvAKKAkQCMAISArgBOgKyAu4CAgPuAvgC5AKeAvQBwgGkAWgBSgEmAtoC0ALQAmICFgOoAjoC6gFUASwB3ACqACYCgAJYAhIC6gESAuQCbALMAUoBDgHcANIARAIcAswBkAE2AYYB1gHQAhwCcgEiAb4AlgAwAtYBGAHcALQAqgAiAcIBxgKaAVQBvgCMADACfAHwAIIAZAB4AJYA0gCkAWwCXgHwALQAMAI2AaoAWgAyACgAMgBaAKoAmgHWAQ4BqgAwAvoAjABGAB4AHgAoACgAPABuAKQBIgGqABwC+gBuADIAHgAUAB4AFAAeACgAMgCkAaoA/gHIAG4AMgAeABQAFAAUABQAHgAeABQAwgE=",
            "j": "MgAOATYBXgF8AZABkAFyAVQBSgFoATYBLAFUAVAALAEOASIB3AC+AIIAbgBuAGQAWgA8AJABNgGCAOYA3ACCAFoAPAAeADIAFAAUABQApAEYAbQA3ADcAIIAUAAeABQAFAAKAAoACgCuAcgAbgBQAHwBeABGADIACgAUABQAAAAKAJABZAAoABQAFADMAVoAFAAKAAoACgAKAAoAXgEyABQAFAAKAAoACAJGABQACgAKAAoAAABKASgAFAAKAAoACgAKABwCMgAUAAAACgAKACIBHgAKAAoAAAAKAAAACgAwAigACgAKAAAAGAEeAAoAAAAAAAoAAAAAAAAAHAIeAAAACgDmABQACgAAAAAAAAAAAAAAAAAAAPQBCgAAANwAFAAKAAAAAAAAAAAAAAAAAAAAAADqAQAAvgAUAAAACgAAAAAAAAAAAAAAAAAAAAAAkAE=",
            "l": "CgAAAAAAAAAKAAoAAAAKAAoACgAAAAoACgAAAAoAAAAAAAAAAAAKAAoACgAKAAoACgAKAAAAAAAAAAoAAAAUAAoAFAAAAAoAAAAAAAAAAAAAAAoAAAAKABQAFAAUAAAACgAKAAoAAAAKAAAACgAKAAAACgAUAAoACgAKAAoAAAAAAAoAAAAAAAoACgAAAB4AFAAUAAoAAAAAAAAAAAAKAAAAAAAKAAAAAAAeABQACgAKAAAACgAAAAAACgAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 156515,
            "raisePct": 36,
            "shovePct": 10,
            "limpPct": 1,
            "rfiPct": 46,
            "completeCells": 169,
            "minimumCellOpportunities": 398
          },
          "SB": {
            "n": "rwIAAJUBAACSAQAAlwEAAJcBAAB2AQAAnwEAAJEBAABxAQAAegEAAHgBAAB0AQAAbwEAANEEAABAAgAAZgEAAHMBAABaAQAAOwEAAFcBAABiAQAARAEAAFYBAABFAQAASAEAAFEBAAB7BAAAUQQAABwCAAB2AQAAbgEAAFIBAAA9AQAAQgEAAEgBAABBAQAAPQEAAEoBAABeAQAAqgQAABUEAAAnBAAAIwIAAEwBAABGAQAATwEAADcBAABIAQAARgEAADwBAAA6AQAAQwEAAJMEAABUBAAAMQQAAFwEAAAEAgAAVgEAAE0BAABeAQAAWAEAAEMBAABlAQAAKgEAADoBAACtBAAAXQQAAD8EAADgAwAAPQQAAOcBAAAuAQAAUwEAACwBAABGAQAAOwEAAEgBAAAQAQAAlgQAAD0EAAAMBAAABgQAAOsDAADIAwAA6QEAADcBAAAzAQAAMgEAAFEBAAAxAQAACgEAAEcEAADqAwAARAQAAMIDAADXAwAA3gMAAOQDAADvAQAAPgEAAFMBAAA2AQAALAEAACIBAAA9BAAA1QMAACIEAADaAwAAyAMAANcDAADgAwAAwAMAAN0BAAAcAQAAPgEAACkBAAAYAQAAKwQAANsDAACoAwAAxwMAANADAACuAwAAfgMAAH0DAACZAwAAtwEAADQBAAApAQAAKQEAAC0EAADoAwAAtgMAALwDAADGAwAAewMAAJ4DAACdAwAAoQMAAJEDAACiAQAAPgEAAAkBAAA1BAAA6QMAAKIDAAC6AwAAuwMAAH8DAAC+AwAAfwMAADADAACOAwAAqgMAAMEBAAAwAQAAMAQAAL8DAACYAwAAmAMAAJoDAAC0AwAAYgMAAFQDAABjAwAAlAMAAIkDAABjAwAApAEAAA==",
            "r": "sgLqAcwBhgFyARgBIgEEAQ4BIgEOASIBIgHqAYoCuAFyAWgBVAEYASwBNgEsASIBaAEYAaQBcgGUAnwBaAFKAUABNgEEAfoADgEsAQ4BXgFeAV4BWAJyAV4BXgEOAfAA+gDmANwA8AAiAUoBVAFUAeABIgEsAQ4B+gDIALQA0gC0AA4BVAEsASIB+gBUATYBGAHwANwA3ADwAAQBBAEiAQ4B5gDSAOYAGAEOAfAA3AC+AMgA3ADwAA4B5gDIAMgAtAC+AAQBGAHSAOYAvgCqAPAADgHSANIAtAC0ALQAqgDmABgBvgDmAKoA5gAsAeYAoACMAKAAggCMAJYAoAAYAb4AlgDwAPoA0gC0AIwAggCCAKAAeACMAKoAqgC0APAA8ADmAJYAeACCAIIAjAB4AIwAeAC0AMgA8ADwAMgAvgCMAHgAggB4AG4AeACCAHgAlgA=",
            "j": "MgByAZoB/gESAk4CTgJ2Ak4COgISAhICJgKQAUYA1gHgAeoBwgGaAXwBNgEiAQ4B5gDwANYBEgKWAK4BhgFeAUAB5gDcANIAlgBkAHgAHAL0AYYB5gC4ATYB3AC0AGQAbgBGAEYAWgB2Aq4BNgH6AJABIgGgAIwAZABGAFAAFAAyAGwCSgG+AG4AeAA6AvAAbgA8ACgAMgAUABQAYgIYAZYAZAA8AEYAdgL6AGQAMgAUABQAFABOAtwAWgA8ADIAHgA8AHYCqgAyACgAMgAUAE4CtABGACgAFAAUAB4AKAB2Am4AKAAyAB4AOgKqADwAFAAUABQACgAKAB4AsgJGADIAPAAIApYAKAAeABQACgAUABQAFAAUAJQCKAAUAP4BjAAyABQACgAKAAoAAAAAAAoACgBsAgoA9AGMADIACgAKAAoAAAAKAAoAAAAAAAAAigI=",
            "l": "BAGCAHgAZABaAG4AbgBkAIIAggC+AKAAlgBkABgBUACMAIwAtAAiASIBSgFoAZABXgFyAWQAWgC0ALQA5gAsAUABmgHWAdYB4AHgAdYBZACCAPAAoAC0AEABkAH0ARwC9AEmAhwC6gFGANIANgFyAW4AmgH0Af4BHAIwAv4BCALWAVoADgGaAdYBCAJQAJoBJgIwAk4CzAGaAaQBbgBAAaQB1gHgARICUADCAU4CMAI6AtYBpAGMAF4BmgHCAbgB4AEmAmQA/gFsAggC4AGQAXgAXgF8AV4BSgFyAbgB/gF4ADACbAIIArgBoAAiAV4BQAEOAQQBVAGQAfQBjAAwAhwCCAKqAEABVAEYAeYA3ADmAA4BSgGQAaAAYgL+AaoANgEsAQ4B3AC0ALQAvgDwAPAANgG0AMwBqgA2ASwB0gC+AJYAqgCCALQAvgC+AMgAoAA=",
            "opportunities": 110043,
            "raisePct": 24,
            "shovePct": 21,
            "limpPct": 30,
            "rfiPct": 45,
            "completeCells": 169,
            "minimumCellOpportunities": 265
          }
        },
        "<15": {
          "EP": {
            "n": "wQsAAJwHAAB8BwAAIwgAAAUIAAC4BwAAkgcAAKQHAAB8BwAAtAcAALYHAACVBwAARQcAAMUWAADqCwAAyAcAAKIHAACJBwAAhwcAADwHAACJBwAAbwcAAIwHAAB3BwAATQcAALMHAACdFwAARxcAAK8LAACUBwAA5AcAAFsHAACJBwAAYgcAAD0HAABNBwAATwcAAGQHAABbBwAAPBcAAJ0WAACfFgAAEwwAAIMHAABsBwAAMQcAAIAHAABJBwAAXgcAAF8HAABeBwAACAcAAFQXAADnFQAA7hUAAPsVAADdCwAAiQcAAC0HAABwBwAAfAcAAF8HAACBBwAARwcAAB8HAADaFQAAcxYAAJoVAABBFgAAsRUAAMULAABoBwAAPQcAAFIHAAClBwAARwcAACUHAABoBwAADhcAANcVAAD3FQAAOhUAAJ8VAADRFQAAWQsAAIMHAAAoBwAAawcAAHAHAABHBwAAcwcAAJcWAADxFQAA0BUAAAAWAAA6FgAAjhUAAPEVAABzCwAAjwcAADsHAABrBwAAewcAAFwHAAD+FQAAjhYAAE4WAACrFQAAeRYAACQWAAAuFgAAyBUAAHQLAAB8BwAAfAcAAGkHAACIBwAAWhYAAE8WAAAuFgAALRYAACIWAAB3FgAArxUAANkVAABUFgAAHAsAAGoHAACWBwAAbAcAACcWAADhFQAAMRYAAEoWAADAFQAAiBYAAPoVAAD2FQAALBYAAOsVAADtCwAASwcAAHwHAABDFgAAbBYAAKYVAACMFQAAxhUAAPYVAACiFgAAthUAAMIVAAAKFgAAkhYAAGILAAB3BwAAhBYAAGEWAAAXFgAAgBUAAE4WAADjFQAATxYAAEoWAADVFQAA5RUAADsWAABhFgAAHAsAAA==",
            "r": "4AG0AKAAqgDIANIAvgCgAKAAoACMAHgAbgCMAJAB8AAOAdwAjABGAB4ACgAKAAoACgAAAIwA0gAYAQ4ByABkADwAAAAAAAAAAAAAAAAAqgCMADIAtADIAFAAKAAAAAAAAAAAAAAAAACgAB4AFAAKAIIAbgAUAAAAAAAAAAAAAAAAAB4AAAAAAAAAAACCAFAACgAAAAAAAAAAAAAACgAAAAAAAAAAAAAAggA8AAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAHgAMgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAB4AB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "j": "uAEWAyoDDAPQAlgCEgLWAV4BrgFUASwBBAE0AxwCsgJOAsIBBAGgAG4ARgA8ACgAKAAeADQDMAKeAuoBaAGgAGQAKAAeABQAFAAUAAoAAgNKAZYAFgNoAYwAUAAoAAoACgAKAAoACgBYAngARgAyAD4DyAAyABQACgAKAAoACgAKAA4BKAAUAAoACgA+A3gAHgAKAAoACgAAAAAAtAAUAAoACgAKAAoAKgNkABQACgAKAAoAAAB4AAoACgAKAAoAAAAKAAIDPAAUAAoACgAAAFAACgAAAAAAAAAAAAoACgCoAjIACgAKAAAAZAAKAAAAAAAAAAAAAAAAAAAAMAIeAAoAAAA8AAoAAAAAAAAAAAAAAAAAAAAAAKQBCgAKADwACgAAAAAAAAAAAAAAAAAAAAAAAABAAQoAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AA=",
            "l": "PAAKAAoACgAUAB4AFAAUABQAHgAeABQAFAAKACgAFAAeACgAFAAKAAoACgAKAAoACgAKAAoAFAAUACgAKAAUAAoACgAKAAoACgAKAAoACgAUABQACgAoABQACgAKAAoACgAKAAAAAAAUAAoACgAKAAoAHgAKAAoAAAAAAAAAAAAAAAoACgAKAAoACgAKAB4ACgAKAAAAAAAAAAAACgAKAAoAAAAAAAAAFAAUAAoACgAAAAAAAAAKAAoAAAAAAAAAAAAAABQAFAAAAAAAAAAKAAoAAAAKAAAAAAAAAAAAAAAeAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAHgAKAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAB4ACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 629781,
            "raisePct": 4,
            "shovePct": 12,
            "limpPct": 1,
            "rfiPct": 16,
            "completeCells": 169,
            "minimumCellOpportunities": 1800
          },
          "MP": {
            "n": "dgkAAEcGAAA3BgAANQYAAGkGAAAUBgAAEgYAADkGAAAXBgAAYAYAAC8GAABpBgAA6AUAAIISAAArCQAASAYAAPAFAAA1BgAAIAYAAHYFAAC6BQAAvQUAAOkFAADrBQAA3wUAAPcFAACnEgAASBIAADIJAADRBQAAKAYAAOMFAAAABgAA2AUAALMFAAD+BQAA9AUAALgFAACkBQAAtBIAABISAACrEQAAuAkAAB8GAADFBQAAAgYAAAAGAACxBQAA2QUAAPEFAADXBQAAxgUAAHMSAAB2EQAArhEAAAUSAABzCQAAEwYAANMFAADgBQAAsQUAANEFAAC4BQAAwQUAAJ0FAAB0EgAAjxEAAAERAABQEQAAgREAAAAJAAAgBgAAzwUAAJkFAACxBQAAuQUAAHwFAACQBQAAQhIAADkRAACoEQAAexEAAEMRAACdEQAA1QgAAOAFAACiBQAA9gUAAI8FAACMBQAAowUAADASAACVEQAADBIAANcRAAAiEQAAXREAAB8RAAAhCQAA7gUAAL8FAACvBQAAsgUAAOMFAAASEgAA8RAAAKIRAAB7EQAAjBEAAEYRAAA3EQAALBEAADsJAACiBQAA3AUAAL4FAACoBQAAzBEAAEcRAAA8EQAAqhAAANQQAAB6EQAASREAAIgRAABQEQAAqggAAKUFAADEBQAA0wUAAFwRAACIEQAAjxEAAHARAABwEQAAZxEAAIkRAABwEQAATBEAAAQRAAACCQAAjQUAAKIFAAD2EQAAQREAAKwRAAC6EQAAPBEAADgRAABJEQAAQREAAFIRAAD5EAAANREAAMAIAADXBQAAgREAAHURAABiEQAAmBAAADcRAACJEQAAdBEAADoRAAA8EQAA/hAAAOkQAAAJEQAAhAgAAA==",
            "r": "1gG+AKAAoAC0AMgAyAC0ALQAtACgAIIAggCWAJAB3AAEAfAAtABkAEYAKAAeABQACgAKAIwA3AAsAfoA+gCMAFAACgAAAAAAAAAAAAAAoAC0AGQAvgDcAG4APAAKAAoAAAAAAAAAAACgADwAKAAeAIIAlgAoAAoAAAAAAAAAAAAAADwACgAAAAAAAAB4AFoAFAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAbgBGAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAHgAPAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAB4AB4AAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAZAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "j": "wgEMAyoDIAMCA6gCRAIwAtYB9AGQAWgBSgE0AxwC0AJ2AhICQAHIAJYAWgBGADIAKAAoADQDbAKUAjoCmgHIAGQAPAAeAB4AFAAUABQAFgOkAcgADAOaAb4AbgAeAAoAAAAKAAoACgCyAr4AZABGAEgD8ABGAB4AFAAKAAoACgAKAHIBKAAeAAoAFABIA5YAKAAKAAAAAAAAAAAABAEUAAoACgAAAAoAPgNuAB4ACgAKAAAAAAC0AAoACgAKAAAACgAKACADZAAUAAoAAAAKAIIACgAAAAAAAAAAAAAACgDkAjIACgAKAAoAeAAKAAAAAAAAAAAAAAAAAAAAgAIUAAoACgBaAAoAAAAAAAAAAAAAAAAAAAAAABICCgAAAFAACgAAAAAAAAAAAAAAAAAAAAAAAACkAQoAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAALAE=",
            "l": "PAAKAAoACgAKABQAHgAUABQAFAAUABQAFAAKACgACgAUABQAFAAUAAoACgAKAAoACgAKAAoAFAAUAB4AKAAUABQACgAKAAoACgAKAAAACgAUAAoACgAoAB4ACgAKAAAACgAKAAoAAAAKAAoACgAKAAoAKAAUAAoACgAKAAAAAAAAAAoAAAAAAAoACgAKABQACgAKAAoAAAAAAAAACgAKAAoAAAAKAAAAFAAUAAoACgAAAAAAAAAKAAoAAAAAAAAAAAAAABQAFAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAUABQAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAHgAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 496781,
            "raisePct": 4,
            "shovePct": 14,
            "limpPct": 1,
            "rfiPct": 18,
            "completeCells": 169,
            "minimumCellOpportunities": 1398
          },
          "HJ": {
            "n": "fgcAAPcEAADsBAAAIwUAAK4EAAD1BAAAdwQAAKsEAACwBAAArAQAAL8EAACOBAAA5wQAAM4OAAA/BwAA6wQAAN4EAADSBAAAdQQAAMQEAACuBAAAnQQAAHIEAABuBAAAqAQAACAEAADfDgAAow4AAAkHAAAQBQAAmwQAAHkEAACKBAAAagQAAI8EAACKBAAArAQAAF8EAACABAAA8w4AAIMOAAARDgAARwcAAJgEAACsBAAAcgQAAI0EAABgBAAAggQAAKEEAACKBAAAvAQAAMAOAAC0DQAAGQ4AAD4OAABYBwAAlAQAAJYEAACGBAAApwQAAGYEAABIBAAAPAQAAIgEAACpDgAAlA0AALoNAADzDQAAfA0AADMHAABiBAAAZgQAAJgEAABvBAAAXAQAAHgEAABdBAAArQ4AAGQNAACBDQAAcg0AAJQNAAAzDQAA6AYAAH4EAABTBAAAKwQAAKgEAABwBAAAVQQAAMoNAAC0DQAAeg0AADsNAABqDQAALQ0AADYNAAADBwAAdQQAAGgEAACQBAAAagQAADgEAAACDgAA+A0AAAYNAACEDQAAaw0AADENAADqDAAARQ0AAOAGAACNBAAAbQQAAGQEAABSBAAAGw4AADQNAABqDQAAHA4AADoNAAAFDQAAGw0AAAoNAAAMDQAAqQYAAH8EAACBBAAAdQQAAH8NAACcDQAAcQ0AABsNAAD/DAAASw0AACMNAABcDQAAhA0AACINAADxBgAAaAQAAEQEAAD4DQAA5g0AAF0NAAAhDQAAVg0AADsNAAAFDQAAYw0AAC0NAAA9DQAAtQwAAPgGAABtBAAAAQ4AACANAABHDQAAWw0AAE4NAABJDQAAwgwAAO0MAAAxDQAAig0AAKsNAADqDAAAdgYAAA==",
            "r": "9AHIAJYAlgC+ANIAtAC+ALQAtAC0AKAAoACWAKQB0gDcAPoAvgCMAFAAUAAyACgAHgAeAIIA3AAsAQQB8ACgAG4AKAAKAAoACgAAAAoAjADSAIwA0gDcAIwAZAAUAAoAAAAAAAAAAACgAHgAUABGAIIAqgA8ABQACgAAAAAAAAAAAGQAHgAKAAoACgBuAHgAKAAKAAAAAAAAAAAARgAKAAAAAAAAAAAAbgBkAAoACgAAAAAAAAAyAAAAAAAAAAAAAAAAAIIAWgAKAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAB4ADwACgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAbgAeAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAGQACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABaAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAA=",
            "j": "pAECAzQDKgP4AsYCvAKAAlgCWAL+Af4BwgE0AxIC7gK8Ak4CuAE2AdwAeABuAFoARgA8AEgDqAKKAlgC9AEsAbQARgAoAB4AHgAeABQANAMIAjYB+AL0AfoAlgAoABQAFAAKAAoACgDuAhgBoAB4AEgDNgFkACgAFAAKAAoACgAKABwCUAAeAB4AFABSA9IAKAAUAAoAAAAAAAoArgEoABQACgAKAAoAUgOMAB4ACgAKAAoAAAA2AR4ACgAKAAAACgAKACADWgAUAAoACgAAANwACgAAAAAAAAAAAAoACgAWAzwACgAKAAAAyAAKAAAAAAAAAAAAAAAAAAAA0AIeAAoACgCgAAoAAAAAAAAAAAAAAAAAAAAAAHYCCgAKAIwACgAAAAAAAAAAAAAAAAAAAAAAAAAcAgoAbgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAkAE=",
            "l": "PAAKAAoACgAKAAoACgAUABQAFAAKABQACgAKAB4ACgAUAB4AHgAKAAoACgAKAAoACgAKAAoACgAeABQAHgAeABQACgAKAAoAAAAKAAAACgAUABQACgAoAB4ACgAKAAoACgAKAAAAAAAKAAoACgAKAAoAHgAKAAoACgAKAAAAAAAAAAoACgAKAAoACgAKABQACgAAAAAACgAAAAAACgAKAAoACgAAAAoACgAUAAoACgAAAAAACgAKAAAAAAAAAAAAAAAAABQAHgAKAAoAAAAKAAoACgAKAAAAAAAAAAAAAAAKAAoACgAAAAAACgAKAAAAAAAAAAAAAAAAAAoAHgAKAAoAAAAAAAoAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 384542,
            "raisePct": 5,
            "shovePct": 16,
            "limpPct": 1,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 1056
          },
          "CO": {
            "n": "MgYAABMEAADfAwAA3gMAAOwDAAC3AwAAtQMAAMUDAACxAwAAoQMAAOIDAAB9AwAAvwMAAEAMAAC7BQAAuwMAAPcDAACnAwAAgAMAAK0DAAC6AwAAiAMAAKUDAAB3AwAAhgMAAG8DAACxCwAABAsAAGwFAAC7AwAAowMAAIEDAAC7AwAAkgMAAJcDAAB1AwAAhwMAACkDAAAtAwAAjwsAAAcLAACzCgAAggUAANwDAACDAwAAkgMAAGgDAACJAwAAnAMAADYDAABlAwAASwMAAIgLAAAfCwAAmwoAAL4KAACGBQAAgAMAAHkDAABmAwAAgwMAAEkDAACAAwAAVQMAAEwDAAAWCwAAuwoAAK4KAABWCgAAoQoAAKsFAACYAwAAjAMAAIUDAAA0AwAASwMAAF8DAAAcAwAAowsAAIQKAAD0CQAARQoAAK4KAAAzCgAAUQUAAGgDAAA4AwAAEgMAACcDAABbAwAALAMAABgLAABPCgAAhAoAABwKAAA/CgAACAoAALsJAAAdBQAAgAMAADYDAABHAwAANAMAAGkDAAAXCwAAaQoAABEKAABpCgAALwoAAF0KAAA5CgAACwoAAD8FAAAlAwAASAMAAEYDAAAtAwAAeAoAAHsKAABfCgAANwoAABMKAAAtCgAA4QkAALgJAADHCQAALQUAAEkDAABnAwAAbAMAAAkLAAChCgAADAoAAC4KAAA5CgAAMwoAAK8JAADcCQAA3gkAAMQJAAApBQAAdAMAAE4DAAD9CgAAIgoAAPsJAABKCgAA9wkAANsJAAAiCgAAHAoAAAAKAADKCQAA0AkAAEEFAABUAwAAUwsAAN4JAADgCQAALQoAAEMKAADQCQAA0AkAACoKAAC5CQAAxgkAALQJAADzCQAAIQUAAA==",
            "r": "9AHIAJYAoACWALQAtAC0ALQAvgCqALQAvgCgAKQBvgC+ANwA0gDIAKoAoACCAGQAWgBaAJYAyABUAfoA3ADmALQAjABQADwAHgAoADIAjADmAMgA3ADmANIAtABkADIAHgAeABQACgCWAL4AqgCCAIwA0gCWAEYAKAAKAAoACgAKAIIAWgA8ACgAKAB4AKAAUAAyABQACgAKAAoAeAA8AB4AHgAUAB4AbgCqADwAHgAKAAAAAABuABQACgAKAAAAAAAKAG4AggAUABQACgAAAFoAFAAKAAAAAAAAAAAACgBuAHgAHgAKAAAAWgAKAAoAAAAAAAAAAAAAAAoAbgBQABQAAABGAAoAAAAAAAAAAAAAAAAAAAAKAHgAFAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAABuAAAAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAA=",
            "j": "rgEMAzQDKgMqAwwD+ALaAsYCsgKyAmwCWAIqAxICAgPuAqgCJgLCAV4BBAHcAKAAqgCgADQD2gKAAooCdgLMAUoBlgBuADwARgAyAB4ANAOAAsIB7gJYAoYBBAFkACgAKAAeABQAFAAWA8IBIgHmAD4DrgG0AEYAHgAKAAoACgAKAMYCyABQACgAMgBIAxgBUAAeAAoAAAAAAAAAdgJuACgAHgAUABQAUgPmADwAFAAKAAoACgAwAjwACgAKAAoACgAUAFIDoAAoAAoAAAAAAMIBKAAKAAoAAAAKAAoACgBIA24AFAAKAAoAwgEoAAoAAAAAAAAAAAAAAAAAFgNGAAoACgBoARQAAAAAAAAAAAAAAAAACgAAANACHgAKAEABFAAKAAAAAAAAAAAAAAAAAAAAAACyAgoADgEUAAoAAAAAAAAAAAAAAAAAAAAAAAAAOgI=",
            "l": "MgAKAAoACgAKAAoACgAUAAoACgAKAAoACgAKAB4ACgAKABQAFAAUABQAAAAKAAoACgAKAAoACgAKAB4AHgAUAB4ACgAAAAoACgAKAAAACgAKABQACgAeAB4AFAAKAAAACgAAAAAAAAAKAAoACgAKAAoAHgAUAAoAAAAKAAoAAAAAAAoACgAKAAoAAAAKAB4AFAAKAAoAAAAKAAAACgAAAAAAAAAAAAAACgAeAAoAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAoAFAAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAFAAKAAAACgAKAAAACgAAAAAAAAAAAAAAAAAAABQAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAUAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 294408,
            "raisePct": 6,
            "shovePct": 21,
            "limpPct": 1,
            "rfiPct": 28,
            "completeCells": 169,
            "minimumCellOpportunities": 786
          },
          "BTN": {
            "n": "IAUAAPECAAASAwAAPgMAABcDAAACAwAADAMAANECAAD6AgAAwwIAANkCAAABAwAA4wIAAJ4JAABeBAAACAMAAPkCAADdAgAA0gIAAPYCAADuAgAA3wIAAMYCAADeAgAAyAIAALUCAABKCQAAtQgAAFoEAAC5AgAA6QIAAMUCAADDAgAAxgIAAMwCAAC8AgAAuwIAAI0CAAB3AgAAOwkAAIIIAACgCAAATgQAANkCAACuAgAAqwIAAI0CAACuAgAAiAIAAJ0CAABwAgAAygIAABYJAAACCQAAuAgAADsIAABJBAAAzwIAAN0CAACpAgAAygIAAMoCAADaAgAApQIAAGYCAADGCAAAXggAABoIAABECAAAUQgAACsEAACWAgAAnAIAAIkCAACQAgAAbAIAAHYCAACWAgAAEAkAAHMIAAA9CAAAAwgAABoIAAAsCAAACAQAAJgCAACxAgAAkgIAAKACAABUAgAAfwIAAOUIAABTCAAA9wcAANkHAADLBwAA0gcAANEHAAACBAAAoAIAALQCAACiAgAARgIAAHICAACzCAAAFwgAACAIAACOBwAA8QcAAMsHAACYBwAAtAcAAPEDAACKAgAAgwIAAEYCAABQAgAA4wgAANsHAAASCAAAlAcAAPoHAADRBwAAiAcAAGIHAACjBwAA5wMAAJYCAABlAgAAagIAANMIAADHBwAAcgcAAMgHAACfBwAAoQcAACgHAABWBwAAaAcAAFQHAADFAwAAhAIAAGACAAChCAAA3QcAALcHAADoBwAAcAcAAHkHAABwBwAAcAcAACcHAABdBwAANgcAAKMDAABmAgAAVggAABQIAACmBwAA2QcAAIAHAACcBwAAwwcAAI4HAABeBwAAXQcAACMHAAAvBwAA5gMAAA==",
            "r": "RAIOAdIA3ACgALQAtACqAKAAvgCqAMgAoADcAOAB3ADSANwA8AAOAfAA+gDmAL4AyADSAKAA3ACuAdwA5gAOAfAA+gDwAKoAtACqAKoAqgDmAA4BLAHwAA4BGAHwALQAggCCAKAAeACqAPAA8ADwAL4ADgEOAeYAlgBuAG4AWgBQAKAAyADIAL4AoAC+APoA8ACWAHgAZABGAEYAqgC+AJYAggBuAG4AlgDwAMgAlgBaADIAMgCgAIwAWgBaAEYARgBkAHgA3AC0AGQARgA8AKAAeABGADwAKAAoADIAWgB4ALQAeABQAGQAlgBuADwAKAAeABQAHgAoADwAggCqAGQAPACWAFAAPAAeABQACgAKABQAFAAyAJYAbgA8AIIAWgAyAB4ACgAKAAoACgAKABQAFABkAFAAlgBQADIAHgAUABQACgAKAAoACgAKAAoAggA=",
            "j": "cgHGAgID7gI0AxYDFgMCAxYD+AL4AuQC+ALuAswB+AL4AtACngJYAjoC4AHCAcIBpAGGATQD7gIcAtoCvAJOAhICXgEiAfAAyAC0AIwAFgPGAmICngKeAvQBmgEYAZYAjABuADwARgAgA3YC9AGuAQwDCAJAAcgAeABGACgAKAAeAAwDwgH6AKoAlgAMA64BvgBuADIAKAAUAB4A+AJAAaoAeAA8AFAANANoAYIARgAoAB4AFADaAg4BWgA8AB4AHgAyAEgDDgFkADIAFAAUAMYCvgBGAB4AFAAUAB4AKABSA9wAUAAeABQAvAKqACgAFAAKAAoACgAKABQAKgOCACgAFACKAoIAHgAUAAoACgAKAAAACgAKABYDMgAeAHYCbgAyAAoACgAKAAoACgAKAAoACgAgAxQAOgJkACgACgAAAAAACgAAAAAACgAKAAoAvAI=",
            "l": "KAAKAAoACgAKAAoACgAKAAoACgAKAAoACgAKACgAAAAKABQAFAAKAAoAFAAKABQAFAAUAAoACgAUAAoACgAUABQAFAAKABQACgAKAAoACgAKAAoACgAeAB4AFAAKAAoACgAKAAoAAAAAAAoACgAKAAoAHgAeAB4ACgAKAAAACgAKAAoACgAKAAoACgAKACgAFAAUAAoACgAAAAAACgAKAAoACgAAAAoACgAoAB4ACgAKAAoAAAAKAAoACgAAAAAACgAKAAoAKAAKAAoACgAAAAAACgAAAAAAAAAKAAAAAAAKAB4ACgAKAAoAAAAKAAoAAAAAAAAAAAAAAAoACgAUAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 227029,
            "raisePct": 12,
            "shovePct": 28,
            "limpPct": 1,
            "rfiPct": 40,
            "completeCells": 169,
            "minimumCellOpportunities": 582
          },
          "SB": {
            "n": "jgQAAMcCAADDAgAAqwIAAHoCAACSAgAAqwIAAJQCAAB1AgAAqwIAAG4CAACJAgAAZQIAALEIAADPAwAAqAIAAKoCAAB9AgAAMgIAAJgCAAA+AgAATwIAAHgCAAA5AgAAawIAACICAADkBwAAVAcAAMQDAACuAgAAdgIAAI8CAAByAgAAYQIAACQCAAAvAgAASgIAADoCAAA0AgAAAAgAAHsHAABbBwAAvQMAAGECAABfAgAAQQIAAEkCAABrAgAATgIAACsCAAA7AgAAMgIAAD4IAABABwAAZgcAAFcHAABiAwAAPAIAAGoCAABzAgAAUAIAABICAABCAgAAJQIAADsCAAD+BwAA6gYAAPgGAABKBwAALAcAAEgDAAAvAgAAOAIAAFsCAAABAgAAKgIAABQCAABIAgAAnQcAACwHAAAeBwAAiQYAAPcGAAC3BgAAJgMAADUCAAAzAgAAQAIAAPoBAAAKAgAA+gEAALIHAABEBwAAqQYAAMEGAADHBgAAkgYAAH4GAABfAwAASQIAACICAAAYAgAAMgIAAAECAADDBwAADAcAABwHAADTBgAAEAcAAH8GAABBBgAAPAYAABsDAAAWAgAAKwIAAPYBAAAAAgAAZgcAACAHAACbBgAAkAYAAPsGAABCBgAAWQYAAF0GAABkBgAAJQMAAA8CAAD/AQAAEQIAALwHAAChBgAArgYAAMMGAACiBgAAbwYAADsGAAAqBgAAGwYAAEsGAAAWAwAA3wEAABcCAACqBwAArQYAAJUGAACOBgAAoQYAAGYGAABjBgAAQgYAACUGAABcBgAAKgYAAO0CAAAqAgAAuQcAAKwGAACqBgAAiwYAAIwGAABRBgAAEwYAADUGAAAhBgAAcQYAAB8GAADbBQAAKgMAAA==",
            "r": "mgHmANIAtAC0AIIAeACMAHgAeABuAG4AZADIAJAB3ACgAIwAeACWAJYAeACCAIIAjAB4ALQAlgByAaAAqgB4AIwAggCMAHgAeABkAIIAoACWAKAAIgF4AJYAggBkAG4AjABuAGQAbgCMAIwAggCMANIAjACCAG4AeABkAFAAWgBaAG4AbgB4AIIAeACqAKAAeACCAHgAbgB4AFAAbgBuAG4AbgBkAG4AeACCAGQAUABaAFAAWgBaAHgAbgBaAFAAUABkAHgAlgB4AIIAZABQAG4AbgBkAGQAUABaAFAAWgBaAFoAeABuAFAAbgBuAFoAZABaAFAAUABQAFAAWgBkAFoAZABaAFAAWgBaAFAAUABaAFAAUABQAFAAbgBkAFoAbgBkAFAAUABQAEYARgBQAFoAUABGAGQAZABkAFoAWgBQAEYARgBGAFAAUABGAEYARgA=",
            "j": "BAGKAtAC5AICAzQDPgMgAz4DPgM0AzQDNAPQAlQB0AIMAwwDAgPaAsYCvAKyAp4CdgJsAvgCFgPCAfgC7gLkApQCJgIcAv4B4AHqAa4BDAMMA9oCRAICA6gCdgIIApoBXgFoAVQBSgE0A+4CqAJsArICgAIcAsIBfAH6AOYA0gC+AEgDvAI6AswBkAEMAyYCpAE2AdwA8ACWAKoANAOKAuoBhgEYARgBPgMmAl4BIgHSAJYAjAA0A04CfAEYAdIAvgAEAUgD4AEsAdwAoACMABYDMAJKAb4AlgCMAKAAyABSA3wB8ACqAKAAIAMIAiwBvgBuAG4AbgB4AKAASANUAaoAggAMA/4BDgGgAFoARgBaAFAAWgCMAFID0gCWABYD1gEEAYwAWgBGAEYAPABGAEYAWgA0A4wADAOuAeYAeABQADwAPAA8ADwAKABGADIAFgM=",
            "l": "QAFkADwAMgAoAB4AKAAyAB4AHgAyADIAPABGAAQBMgAyADwAUABaAFoAggCMAJYAqgC0ADIAKACqADwARgBkAJYA5gDmAAQB+gDwAA4BKAAyAFAAeABQAIwAtAAYASwBNgEYASwBLAEeAEYAjAC0AFoAtADwADYBLAFoAXIBLAFAAR4AbgC+APAALAEoAPAASgFeAV4BNgE2ASIBKAB4ANIADgEsAVQBKADwAJoBhgFeAV4BLAEoAIwA0gD6ACIBLAFKAR4ADgGGAUoBVAEYATIAjADIANwA5gD6ACIBQAEoAHIBhgFeASwBMgCMANIAvgC0AL4A5gD6ACwBKAByAXwBQAE8AJYAtACqAKAAqgCgAKoA0gAEATwAfAE2ATwAggCgAKoAlgBuAIIAggCgAKoAvgBGAEoBMgCMAKAAlgCMAHgAbgBaAIIAggB4AIIAZAA=",
            "opportunities": 193659,
            "raisePct": 11,
            "shovePct": 42,
            "limpPct": 17,
            "rfiPct": 53,
            "completeCells": 169,
            "minimumCellOpportunities": 479
          }
        }
      }
    },
    "l2": {
      "label": "Лига 2",
      "shortLabel": "Лига 2",
      "ranks": "R6–10",
      "description": "Активные реальные игроки текущей Лиги 2 с минимум 30 000 рук в окне FFEV.",
      "players": 484,
      "selectedPlayers": 484,
      "charts": {
        "70+": {
          "EP": {
            "n": "Ny4AAF0eAAA3HgAA+x0AALYeAACKHgAAXR4AANEdAAC7HQAAfR0AADUeAADkHQAAdx4AAHxcAADzLgAAsB4AAN8eAAB7HgAANh4AAPEeAAD0HQAAgR0AAA0dAACIHQAAVB0AAH8dAACJWgAAZ1kAAMMuAADTHQAAVx4AANcdAABrHgAAOx0AAAEdAADMHQAATh0AACIdAAB9HQAAK1oAANJaAAAGWgAAkC4AABseAAAQHgAAyR0AAAweAAAbHQAAIh0AAIkdAAAwHQAANx0AAClbAAB7WAAAN1kAAExYAAC7LgAAAR4AAGoeAABUHQAA1hwAANodAAAcHgAAdB0AALIdAAC0WQAAN1gAAAhYAABwWAAA/VYAAB4uAAAuHgAA9xwAAO8dAADPHAAAyh0AADUeAAAVHgAAalgAAHhYAADwVwAAb1cAAEpXAAAjWAAAky0AAOgdAAAQHQAA5xwAAFYdAAANHQAAkx0AALZYAAB6WAAAN1gAAGJXAACpVwAAYlgAAABZAACYLgAAiR4AAP4dAAALHQAAYB0AAF0dAACVWAAAzlcAAFdYAAAfWAAACFcAAJ9XAADBVgAAPFgAAMItAAC7HQAAVB0AAOUcAAAXHQAAilgAAENZAABSWAAAcVgAABtZAABWWAAAOVgAAJpYAACuWAAAvC0AAJsdAAAiHQAApx0AAPtXAADbVwAAOlkAAL5YAABqWAAAJFcAAA1YAAAPWAAAqlgAAKpXAACzLAAAgR0AAD4dAAByVwAAB1cAAIhYAAA1WAAAFlgAANpYAADfVwAAJFgAALtYAAD9VwAAhVkAAPEsAACVHQAAyFgAAAxYAACPWAAAtVgAADtYAACdVwAAUFgAAB5ZAABKWAAAc1cAAI9YAABvWAAAMi0AAA==",
            "r": "1APUA94D6APeA94D3gPeA9QD3gPUA9QDygPUA9QD3gPeA94DwAM0A04CLAG+AIIAWgBGAN4D3gPUA94D3gOYA8YCZAAeABQACgAKAAoA3gOYA04C3gPeA6ID0AJaAAoACgAAAAAAAADUA6QBGAEEAd4DygOeAlAACgAAAAAAAAAAAPoACgAKAAoACgDeA6wD0gAeAAoAAAAAAAAARgAAAAAAAAAAAAAA3gOOA6AAFAAAAAAAAAAUAAAAAAAAAAAAAAAAAN4DXAM8AAoAAAAAAAoAAAAAAAAAAAAAAAAAAADeA9oCHgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAygN8AQoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAJgDMgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqAI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "FAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 2512775,
            "raisePct": 22,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 22,
            "completeCells": 169,
            "minimumCellOpportunities": 7375
          },
          "MP": {
            "n": "XSQAAMQXAACzFwAAPxcAACQXAAAjFwAA9BYAAIsWAABLFwAAgBYAACUXAABbFgAAUhYAAA9HAACTIwAAXBcAADcXAABLFwAAHBcAABQXAADOFgAALBYAABgWAADmFQAAThYAAMYVAAAmRQAA2kMAAGEjAABrFwAARxcAALgWAACYFgAACRYAAA0WAAB4FgAA1hUAAJcVAACbFQAAsUUAAKdDAABQRAAAhyMAAO0WAABcFgAAHRcAACgWAAAGFgAA3BUAANkVAADKFQAA5RUAAKFFAABqRAAATUIAADFDAABMIwAAuBYAAC8WAABRFgAAuBUAANgVAAAWFgAA9xUAAGIWAABtRAAAn0IAAOFCAAAWQwAAo0IAAJ0iAAChFgAADBYAAK8VAABKFgAArBUAAPMVAAC6FQAAXkMAABNDAACVQgAAP0IAAKJBAAB+QQAAxiEAAIYWAACzFQAAjhUAAOcVAAAhFgAARhUAADhCAACfQQAAE0IAAMpBAABEQgAAHkIAALBCAAB9IQAATxYAAPQVAAAVFgAAohUAAKkVAAD1QgAAhEMAAONBAAALQgAAd0EAAM9BAAB9QQAA2UEAAKkhAADXFgAABRYAABEWAACJFQAAMEIAAClDAACzQQAAwUEAAAFCAADVQQAA6kEAAGdBAAAoQQAAUSEAAFcWAADKFQAABRYAAHdCAADyQQAAz0EAAIFCAADxQQAA1kEAAOtAAACRQQAAHEEAALdBAAD2IAAABhYAAB4VAADUQgAAhEMAAH1BAABUQgAA0UIAAF1BAAC7QQAA3UAAAKFAAAAzQQAAy0EAANYgAACWFQAAMUMAAPpBAACjQQAArUEAACRCAABsQQAAFUEAAO1AAAD0QAAABEEAAGJAAADSQAAAuCAAAA==",
            "r": "1APeA94D3gPeA94D3gPeA94D3gPeA9QD1APeA9QD3gPeA94D1AOEA+4CMAKuAUAB8AC+AN4D3gPeA+gD3gPAAz4D8ABaADIAHgAUABQA3gPUA1wD3gPeA8ADUgPcABQACgAKAAoAAADeA+4CdgJEAt4D3gMgA8gAFAAAAAAAAAAAACYCKAAUAAoAFADeA8oDcgE8AAoAAAAAAAAADgEKAAAAAAAAAAoA3gO2AxgBHgAKAAAAAAA8AAAAAAAAAAAAAAAAAN4DmAN4ABQAAAAAABQAAAAAAAAAAAAAAAAAAADeAz4DRgAKAAAAHgAAAAAAAAAAAAAAAAAAAAAA1AMcAhQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAMADUAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAACOAwoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "FAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1883471,
            "raisePct": 26,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 26,
            "completeCells": 169,
            "minimumCellOpportunities": 5406
          },
          "HJ": {
            "n": "nBoAAFoRAABUEQAAKBEAAPYQAAD+EAAA7w8AADAQAADtEAAAjRAAANUQAACoEAAARxAAAC80AACdGgAAeRAAAMsQAACdEAAA8g8AAAQQAACTEAAAyQ8AAFEQAAAxEAAA3A8AAEAQAAB4MwAAUjEAANwZAACzEAAAkBAAAH0QAAAHEAAAHBAAAL8PAADLDwAAyQ8AALIPAAAIEAAAaDMAAB8yAAAOMQAAtxkAAKQQAAB/EAAAmBAAAOYPAADiDwAAVQ8AAM0PAAB2DwAAWQ8AANgyAABlMQAAFzEAAEwwAAAGGQAA1w8AANcPAADIDwAAkA8AAMYPAACeDwAAVQ8AAFQPAAAIMgAAKDAAANsuAAAcLwAAsy8AAJYYAAAxEAAAsQ8AAEoPAAArDwAA5Q8AAFAPAABJDwAAbjEAANwvAAAAMAAAeTAAAEgvAAB3LwAAfRgAAMMPAACNDwAAUg8AAAEQAACHDwAAdA8AAKAxAAAhLwAAvS8AAHMvAADsLwAAkC4AAHMuAABCGAAAtw8AAJgPAACNDwAAdg8AACIPAAB5MAAAGy8AANYuAAA9LwAAJC8AALMuAACrLgAADi4AAMEXAACmDwAA5A4AAFEPAAAADwAALzAAAMsvAABGLwAA6S4AAPQuAACpLgAAwy4AAKwuAAAPLgAAohcAAIcPAABEDwAAjw8AAMowAACPLwAAGi8AAD0vAAAOLwAAbS4AAJguAACILQAAiS4AABgtAAC7FwAA8Q4AAO0OAABVMAAAsy8AAA8vAAAvLwAAPy8AAIQuAABOLgAAGy4AALktAADFLQAACi4AADIXAAD8DgAAZTAAACIvAAAsLgAA1C4AAIcuAADMLQAAiS4AAOAtAAD+LQAApi0AAGktAACiLQAAgxYAAA==",
            "r": "3gPoA94D3gPoA+gD3gPeA94D3gPeA94D3gPeA94D6APeA+gD3gO2A44DNAPaAoACMALgAegD3gPeA+gD3gPeA6wDgAJKAdwAjABkAFoA6APeA8oD3gPeA9QDrANOAm4APAAoAB4AFADeA6IDZgM+A+gD3gOOAyYCeAAUAAoACgAKAFwDNgF4AG4A3ADeA9QDxgK0ACgACgAAAAAAlAIoABQAHgAKACgA3gPKA0QCeAAUAAoAAACQAQoAAAAAAAAAAAAKAN4DtgNAATwACgAAAIwACgAAAAAAAAAAAAAACgDeA44DvgAeAAoAqgAAAAAAAAAAAAAAAAAAAAAA3gPQAjwACgBaAAAAAAAAAAAAAAAAAAAAAAAAAN4DqgAKADwAAAAAAAAAAAAAAAAAAAAAAAAAAADAAxQAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAogM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1346844,
            "raisePct": 31,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 31,
            "completeCells": 169,
            "minimumCellOpportunities": 3812
          },
          "CO": {
            "n": "kRIAAAsMAACUCwAA3wsAACIMAAAxCwAApAsAAFILAABCCwAAQwsAAMEKAAD3CgAA3QoAADYjAACNEQAAgwsAAB0LAAAJCwAA4goAANEKAABACwAAEgsAAKkKAACaCgAAPgoAAEMKAAD2IgAA4iEAAEgRAAAZCwAAXAsAAFoLAAD8CgAA9AoAAH4KAABGCgAA2goAAHcKAAA/CgAAHyMAALshAADwIAAAGxEAACcLAAADCwAA6woAAJMKAAC4CgAAwgoAADMKAABNCgAAZAoAAE8iAAA8IQAACyEAAFghAAD3EAAABAsAAPwKAADyCgAAZQoAALQKAACBCgAAhgoAAHEKAAAzIgAA4h8AAGUgAABNIAAAax8AACIQAAACCwAAkwoAALQKAABcCgAAbwoAAJYKAAAjCgAAhiEAAAogAAAqIAAALCAAALkfAAAKIAAAOxAAAIAKAACBCgAA2gkAAB4KAAD8CQAAywkAALMhAADQHwAARx8AAEMfAABpHwAA8x4AAGoeAAD1DwAACAoAAHUKAAAQCgAA5QkAAA8KAAAYIQAA0x8AAOcfAACCHwAAWh8AAOMeAADOHgAALh4AAIMPAACICgAAMgoAANsJAACfCQAAPiEAAIAfAACsHwAAqx8AAJEeAAAQHwAA/x0AAKoeAACUHQAAsQ8AAE8KAAAdCgAAmQkAALkgAADMHwAARR8AAEgfAAB7HwAAZR4AAJgeAABZHgAAJx4AAMQdAACrDwAARgoAAMgJAACEIAAAAh8AADEfAABFHwAAeh8AAEkeAACjHgAAAx4AAGMdAABMHQAAth0AAI4PAAA2CgAAMCEAALMfAAAFHwAALB8AADcfAABQHwAA5h0AAOodAABIHQAA3R0AAOwdAACjHQAAeA8AAA==",
            "r": "3gPeA94D6APeA+gD3gPoA94D3gPeA94D3gPoA94D3gPoA94D3gPeA9QDwAOsA5gDcANIA+gD6APoA+gD6APeA8oDjgM+AwwDvAJ2AjoC3gPoA94D3gPeA94D1ANwA4ACCAKuAUAB+gDeA9QDygPAA+gD3gPKA2YDRALIAHgAUABGAMoDNAPQAp4CsgLeA94DmAOKAvAAWgAoACgArAMSApoBkAEsAZoB6APeA2YD1gGWACgAHgBmAywBMgAoAB4AMgC0AN4D1APGAiwBRgAeAAwDWgAUAAoACgAKAB4AWgDeA8ADOgKqACgAKgMyAAoAAAAAAAAACgAKACgA6AN6Aw4BUADQAigACgAAAAAAAAAAAAAACgAUAN4DpAFQAIACHgAKAAAAAAAAAAAAAAAAAAAAAADeA2QAOgIUAAAAAAAAAAAAAAAAAAAAAAAAAAAAygM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 898004,
            "raisePct": 43,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 43,
            "completeCells": 169,
            "minimumCellOpportunities": 2457
          },
          "BTN": {
            "n": "eAsAAG4HAAAKBwAABwcAAC0HAAD7BgAAkwYAABIHAAB3BgAAtgYAAMQGAACrBgAAeQYAAAgVAABZCgAAugYAAHYGAACcBgAAkAYAAGYGAAB3BgAAhgYAAGgGAABaBgAAOAYAAHEGAACBFQAANxQAACkKAACIBgAAWAYAAHMGAABCBgAAXQYAADAGAAAKBgAAQAYAADUGAAAKBgAAzhQAAKQUAACgEwAA+QkAAJ0GAAB2BgAAigYAAGkGAABwBgAAWgYAABoGAAA8BgAAGQYAAPQUAADiEwAA5xMAALoTAAAxCgAAdgYAABUGAAAoBgAAOAYAAEAGAAAeBgAA2gUAANUFAABgFAAADxMAAHMTAABUEwAAbBIAAJcJAADyBQAABgYAAOIFAAAFBgAAKAYAAPIFAACuBQAAWhQAADUTAAAsEwAAuBIAACgTAAA/EgAAjwkAAOQFAAD5BQAAKQYAAPsFAAAUBgAA1wUAANYTAADHEgAAFxMAAKgSAACyEgAAbhIAAA0SAAAZCQAA9AUAAN4FAADJBQAAGQYAAPMFAADwEwAAuxIAAKcSAAB2EgAAiBIAANIRAACaEQAAuxEAABwJAACsBQAA2AUAAGQFAACeBQAAthMAAI0SAABpEgAAfBIAAM8RAACnEQAAYREAAE8RAACfEQAAxQgAAMIFAAC0BQAAugUAAHYTAAAaEwAAIhIAAAgSAAAFEgAAjBEAAHIRAAD8EAAAzxAAABYRAACnCAAAqAUAAJQFAAABFAAAHRIAAG8SAAA9EgAA8BEAAFARAABXEQAARREAAHkRAADiEAAAEREAAJ4IAACwBQAAVRMAAHkSAAAKEgAA7BEAAK0RAAAsEQAAaxEAAGwRAAC0EQAAkRAAALsQAAD+EAAAcAgAAA==",
            "r": "6APeA94D6APeA94D3gPoA94D3gPoA+gD3gPeA94D3gPeA94D6APeA94D3gPUA9QDygPKA+gD3gPoA94D3gPeA94D1APKA8oDtgOsA5gD3gPeA94D6APeA94D3gPUA6wDhAN6A3oDUgPoA94D3gPeA94D3gPeA8oDtgNIAyAD7gKoAt4DygPAA6wDtgPeA+gD1AO2A1wD+AKoAlgC3gOiA3oDZgM+A2YD3gPeA8oDhAMgA5QCWALUA3ADvAKeAmICigIqA94D3gPAA2YDqAIwAsoDFgM6AnIBSgGGARwC2gLeA9QDmAMgA3YCygPQAswB8ACCAIIA5gByAU4C6APUAz4DlALAA5QCkAHIAFoARgBaAIwA+gCuAd4DcAOeArYDWAJeAaAARgAyADIAPABaAG4AlgDeA4ACrAMwAkABjAA8ACgAKAAeACgAMgAoADIA3gM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 525846,
            "raisePct": 67,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 67,
            "completeCells": 169,
            "minimumCellOpportunities": 1380
          },
          "SB": {
            "n": "3AQAADsDAAD/AgAAHAMAAOwCAAAFAwAAEwMAAM4CAADhAgAApwIAAL8CAADBAgAA1AIAAGMJAAAlBAAAwQIAAM0CAACbAgAAwQIAAIsCAADIAgAAsAIAANECAACaAgAAigIAAHoCAABMCQAAPwgAACEEAADKAgAAtQIAAL4CAAC+AgAAqQIAAJ4CAAB1AgAAcwIAAIUCAABfAgAAAgkAADUIAABsCAAA/QMAAKcCAAC/AgAAqQIAAMYCAACeAgAAewIAAKICAABRAgAAQgIAABkJAABFCAAAJAgAACkIAAATBAAAfQIAAJQCAACYAgAAeQIAAJUCAAB6AgAAZwIAAFcCAAC0CAAA9AcAAAQIAAAgCAAAEAgAALgDAAByAgAAYwIAAH4CAABvAgAAkQIAAJUCAAB7AgAA4wgAACoIAACUBwAA8gcAAMIHAABnBwAA0QMAAHQCAACnAgAAegIAAFwCAABlAgAAcwIAAIEIAACmBwAAlAcAAMAHAABtBwAAuwcAAF4HAADNAwAAjQIAAFUCAABxAgAAYwIAAEYCAABhCAAA6wcAANMHAABQBwAAdgcAAHwHAABgBwAAPwcAAKIDAABVAgAAZwIAADACAAAhAgAAaAgAAP0HAAABCAAAfgcAAKAHAAC6BwAABQcAABIHAADsBgAAhwMAADECAABBAgAAewIAAEIIAAC2BwAAuQcAAJsHAAB/BwAAJwcAAAkHAADsBgAADgcAAKkGAAB4AwAARAIAADQCAADZBwAApwcAAJwHAAA8BwAA5QYAAEUHAAAWBwAANwcAANgGAACMBgAAkQYAAGcDAAA0AgAA9wcAAKUHAAAnBwAAXgcAAEMHAAAHBwAA4gYAAJ8GAACrBgAAnAYAAPYGAABqBgAALwMAAA==",
            "r": "jgO2A6wDygOiA3oDcANcAzQDKgMWAwIDDAPAA6wDtgOiA3ADKgPQAsYCsgKoAp4CgAKKAsADmAOsA2YDUgPaAp4CCAIwAjACJgImAhwCtgN6AxYDtgM0A8YCigJEAkQCJgIcAv4BJgKYAzQD2gKoAsoD+AJ2AhIC9AHqAfQB1gHgAXAD0AJ2AjoCCAKsA4oCMAIIAvQB9AHgAeABNAOAAjAC/gHMAcIBmAOAAggC1gHgAcIBwgEWA2wC/gHWAZABmgGkAYQDdgL0AeoBwgGQAe4CdgL0AaQBcgF8AZABkAEqA04C4AH0AeoB5AJiAuABkAE2ATYBNgFoAXwBsgImAuABuAHQAmwCuAFyASwBBAEOASwBVAFUAagCwgHWAdACRAKuAV4B+gDwAOYA8AAOAQQBGAFsAq4BvAI6Aq4BXgH6APAA3AC+ANwA5gDcANIATgI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "WgAyADIAHgA8AGQAeACCAKoAtADIAOYA0gAeADwAKABGAG4AtAAOARgBLAE2ATYBXgFKASgARgA8AHgAlgAEAUABzAGaAa4BpAGkAa4BKABkANIAKACqABgBVAGaAYYBpAGkAcIBkAFGAKoABAE2AR4A8ABeAcIB4AHWAa4BwgHCAW4ADgFeAZABzAEyAEoBpAHCAcIBuAGuAbgBqgBKAYYBuAH0Af4BUABeAdYB9AHWAcIBuAG+AEABkAGuAdYB6gEIAmQAaAHqAdYB4AHCAeYANgFoAWgBkAHMAeABEgK0AJAB6gHCAa4B8AA2AV4BVAEiAVQBrgHWAQgCLAGuAdYBzAEEASIBXgFKAfAA8AAYAV4BpAH+ATYBEgLWAQQBLAFKATYB5gC0AL4A3AAsAXIBkAFyAdYBGAEiAUAB+gDIAJYAoACMAL4A3ADcANwAmgE=",
            "opportunities": 216344,
            "raisePct": 56,
            "shovePct": 0,
            "limpPct": 30,
            "rfiPct": 56,
            "completeCells": 169,
            "minimumCellOpportunities": 545
          }
        },
        "30-70": {
          "EP": {
            "n": "XToAAHQmAABzJgAAXyUAAOMlAACEJQAAbCQAAEclAACoJQAACSUAAFElAAAPJQAAriQAANNyAABMOQAAMSUAAHglAAB7JQAApCQAACAlAABBJQAAQCUAAA4lAABAJAAAqiQAAFwkAABkcQAAN3EAAO05AAAQJQAAXSUAALQkAADdJAAA5CQAAH4kAACrJAAAMiQAAFskAADLJAAAUHEAAHFvAABgbgAANjoAAKklAADAJQAAgiUAAKwkAAANJQAAwyQAAKkkAADNJAAAkyQAADdwAABjbgAASnAAANdtAACYOQAAAyUAAL4kAABmJAAAiiQAAGslAABSJAAA9yMAAOAkAAC5bQAAAG4AAL9tAADobAAAJm4AAD05AADTJAAATyQAAAokAAChJAAAFSQAAE4kAABTJQAALW8AAK9tAAC4bQAAR24AAAhuAABHbQAAIzkAAO0kAAB9JAAAoyQAAOskAACRJAAAQSUAAFVtAAB8bQAAtG0AANFtAAArbQAAXG4AAPpsAABiOAAACSUAAEwjAADIJAAAvyQAAAYkAABabgAAT20AAFVsAAAMbgAAjW0AAGtuAABEbgAA424AAPc4AAAUJQAAXCQAAJUkAAC1IwAACW4AALBtAAArbQAAxm0AAHluAAAMbAAAi20AAEBtAAB6bQAANjgAAEckAAB+JAAALCQAACZuAACJbQAAPmwAAB9tAABYbQAAu20AANBtAABjbgAAAW4AAK5tAADJNwAABiUAAC0kAADBbQAA+GwAAFVtAACrbAAAt2wAACxuAAB8bQAAuG0AADJtAADPbQAAaW4AAHA3AAChJAAA3m4AAGVsAABebgAAP24AAJNtAABGbgAA5G0AADhtAACEbQAA/W0AANxtAAAmbgAAPTcAAA==",
            "r": "1APeA94D3gPeA94D3gPUA8AD1APKA7YDmAPeA94D3gPeA94DogPaAtYB8ACMAGQARgAyAN4D3gPeA94D1ANmA04CUAAeABQACgAKAAoA3gOEAxwC3gPeA1IDRAJGAAoACgAKAAAAAADKA4YB+gDSAN4DmAMIAjwACgAKAAAAAAAAAA4BFAAKAAoACgDeA0gDlgAUAAoAAAAAAAAAUAAKAAAAAAAAAAoA3gMCA2QACgAKAAAAAAAeAAAAAAAAAAAAAAAAANQDigIoAAoAAAAAABQAAAAAAAAAAAAAAAAAAADAAwgCFAAKAAAAFAAAAAAAAAAAAAAAAAAAAAAAhAPcAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAPgCFAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABEAgAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwgE=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 3121260,
            "raisePct": 21,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 9036
          },
          "MP": {
            "n": "gy8AAA8fAAAgHwAA0R4AAAQeAABqHQAA7R0AADkeAABOHgAAZh4AAAAeAABMHQAADB4AAIxdAADJLgAAGh4AAOIdAACvHQAAkR0AAHIdAAAIHQAA0RwAAOEcAAAxHQAAUh0AACgdAABFWwAAz1kAAJouAAANHgAA/h0AAPIcAAAJHQAArhwAAKQcAAD3HAAAvRwAAD0dAACDHAAAkVoAAEhZAAB5WAAA1C0AANsdAAA+HQAA3xwAAEMcAADCHAAAMR0AAP0cAAAXHQAAHR0AALtaAABkWgAAWlgAAGBYAACgLQAAFx4AAHQdAADrHAAAAx0AAOYcAACxHAAAzBwAAAcdAAAQWAAAv1cAAChXAAAlVwAAKlcAAA8tAABnHQAAmxwAALQcAAA/HQAAdhwAAJscAACuHAAAh1gAAE1XAACFVwAAYlcAAB9XAAAYVgAAnSwAADcdAADWHAAA3hwAAAYdAABkHAAA+BwAAIZYAAD6VgAA91UAAKRWAADbVgAAylUAAIVVAAA2LAAAIR0AAJscAADdHAAARxwAAEocAAA0VwAA9VYAAOhWAADgVgAAJFcAAABXAABHVgAAuVYAAJ0sAAD4HAAAthwAAK8cAAAXHAAAkFcAAO5WAABiVgAA4FYAAOZWAADjVgAAclUAAARWAAD0VQAAcCwAAOwcAADJHAAALR0AAJ1XAADoVgAAn1YAAL9XAACTVQAApFQAAKlWAABJVgAAg1UAAEBVAAA8KwAA+xsAAEkcAABnVgAAz1cAAKhWAACqVgAAsFUAAPdUAAA7VQAA0FUAAClUAAB8VQAAaFUAAOwrAAAmHAAANlgAAIxWAACjVwAAB1YAAL9WAADqVQAAdlUAAKBVAADdVQAAb1UAAJ9VAABpVQAAtCoAAA==",
            "r": "3gPeA94D3gPeA94D3gPeA9QD3gPUA8oDwAPeA94D3gPeA94DygNSA54C4AFUAfoAtACMAN4D3gPeA94D3gOiAwIDyAA8ADIAHgAUAAoA3gPKAz4D3gPeA5gD+AKqABQACgAKAAoACgDeA8YCMAL+Ad4DwAOeApYAHgAKAAAAAAAAADACKAAUABQAFADeA44DGAEoAAoAAAAAAAAABAEKAAoACgAKAAoA3gNcA8gAHgAKAAAAAABQAAoAAAAAAAAAAAAKAN4DDANGABQAAAAAAB4AAAAAAAAAAAAAAAAAAADUA5QCKAAKAAAAKAAAAAAAAAAAAAAAAAAAAAAArANoAQoAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAGYDKAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAADuAgAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 2468790,
            "raisePct": 25,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 25,
            "completeCells": 169,
            "minimumCellOpportunities": 7163
          },
          "HJ": {
            "n": "CCYAAF8YAAAFGAAA+hcAAHgXAACqFwAAvhcAAAkXAAA5FwAAuBYAABUXAAAVFwAAvhYAAGRIAACwJAAAexcAAHoXAABkFwAAshYAAK4WAAAiFwAAzBYAAOwVAABgFgAAzBUAAJoWAACCSAAAh0UAAKsjAAAzFwAAqhYAAPgWAADjFgAAnBYAAPIVAAAGFgAAdRYAAPQVAAAIFgAA2EgAACBFAAD5RAAAUiMAACYXAAAVFwAAzRYAAOMVAAC1FQAACBYAACkWAAAeFgAAyhUAAJNHAAAERQAAJEQAAOhDAAADIwAA4hYAABsWAAAyFgAABxYAAMkWAAC8FQAA1RUAAN8VAAAtRgAAE0QAAFtDAACuQwAAZ0MAALchAABwFgAAIRYAAIwVAACEFQAAkRUAAPcVAADAFQAAHUUAAKFDAAAzQwAAXUIAAEtCAACeQQAA6yEAAEwWAAACFgAAExYAAIgVAADPFQAApBUAANVEAAChQgAA0UIAAPVBAAAZQgAAbEEAAIFBAABhIgAA7RUAAKUVAAAEFgAARxUAAHMVAAC/RAAARkIAAHBCAAAGQwAAukEAAElBAAB2QQAAaEEAAHUhAADeFQAAdhUAAHQVAABxFQAAtUMAALNCAAC4QQAApkIAANtBAAC4QQAAkkEAAPBAAAAQQQAA1yAAAHMWAABCFQAA+xUAAA5EAAAqQwAAI0IAAKZBAACPQQAAH0EAABpBAAAfQQAA3EAAAHRAAACrIAAA5BQAALsVAADrQwAAr0IAABNCAABcQQAApUEAAGNBAADSQAAAnkAAAJFAAACPQAAAt0AAAEUgAAATFQAAXkMAAJpCAACHQQAAfUEAACNBAABMQQAAs0AAAKlAAADqPwAAgUEAADRAAABSQAAARiAAAA==",
            "r": "3gPeA94D3gPoA94D3gPeA94D3gPeA94D1APeA94D6APeA94D1AO2A2YD7gKKAjAC1gGGAd4D3gPeA94D3gPUA4QDOgIOAaoAggBaAEYA3gPeA8AD6APeA8oDegP+AWQAMgAeAB4AFADeA44DSAMWA94D3gNIA8IBZAAUAAoACgAKAFwDGAF4AFoAtADeA8ADTgKMAB4ACgAKAAoAlAIyAB4AHgAUAB4A3gOiA8wBUAAUAAoAAACQARQACgAKAAAACgAUAN4DegPcADIACgAAAKAACgAAAAAAAAAAAAoACgDUAxYDeAAUAAoAtAAKAAAAAAAAAAAAAAAAAAoAygMmAigACgBuAAoAAAAAAAAAAAAAAAAAAAAAAKwDZAAKAEYACgAAAAAAAAAAAAAAAAAAAAAAAAB6AwoAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 1890180,
            "raisePct": 30,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 30,
            "completeCells": 169,
            "minimumCellOpportunities": 5348
          },
          "CO": {
            "n": "8hsAAKkSAABHEgAA+BEAAA4SAAAqEQAA0hAAAHYRAAAhEQAA1RAAAGwRAACqEAAAdxAAAE42AABpGgAAMBEAADgRAAC6EAAACxEAAGAQAAByEAAAzxAAAE4QAAA8EAAAWhAAAEcQAABQNQAAGjMAAPAZAADUEAAAtxAAAKUQAAC8EAAAQxAAAFcQAABsEAAAChAAAD4QAAAXEAAAzjQAAFsyAABOMwAA/xkAAMcQAAB3EAAAQRAAAGsQAAAwEAAAMxAAANkPAADfDwAA0g8AAEM1AADZMgAAFDIAAGYxAACVGQAAeBAAAC8QAAAhEAAA+w8AAOcPAABiDwAAnw8AAOYPAADpMwAA5TEAAGQxAAC8MAAAHzAAAOcYAABOEAAA5g8AAKcPAABYDwAAbQ8AAE4PAACVDwAA1TMAAIQxAAAvMAAA6i8AAIwwAAA/LwAA8hgAAA0QAAAaEAAAxg8AAGoPAABoDwAANA8AAAEzAABDMAAAOzAAAN8uAACaLwAAhC4AADsuAADTFwAA+Q8AAK0PAAAoDwAAmg8AAFcPAADxMQAAmjAAANMvAAB8MAAAeC8AAJ0vAAARLgAAIS4AAPwXAACYDwAAsQ8AANwOAADmDgAAoTMAAOQvAACjLwAAvy8AADkvAAD4LgAAqy4AAN8uAABULgAAvxcAAGAPAABCDwAA8w4AAGUyAAAKMAAABy8AAOMvAADQLgAAli4AAGEuAAA/LQAAWy4AAEEuAAACFwAATQ8AACoPAACKMgAATDAAACUwAABiLwAAGS8AAN0uAADoLQAADy4AAJ0tAACXLQAAUS0AAA4XAABIDwAAAjIAAOwwAAD3LgAA8i4AAGIuAADSLgAAfC0AAM0tAABaLQAAfi0AAAEtAABOLQAAmxYAAA==",
            "r": "3gPoA94D6APeA94D6APeA94D3gPeA94D3gPeA94D6APoA94D3gPUA8oDrAOYA3ADSAMWA94D6APoA94D3gPeA8oDegMCA6gCYgIcAtYB3gPeA94D6APeA94DygNIAyYCpAFKAfAAyADeA9QDwAOsA94D3gO2AyAD4AGgAGQARgAyAMoDDAOUAlgCWALeA9QDZgMSAr4ARgAoAB4ArAPWAV4BSgHwAEAB3gPKAxYDaAFuACgAHgBmAwQBMgAoAB4AMgCMAN4DwANYAuYAPAAeAPgCWgAUAAoACgAKAB4ARgDeA44DwgGMACgAFgM8AAoACgAAAAAACgAKACgA1AMMA74AMgCyAh4ACgAKAAAAAAAAAAAACgAUAMoDQAE8AFgCHgAKAAoAAAAAAAAAAAAAAAAAAADAA0YAEgIUAAoAAAAAAAAAAAAAAAAAAAAAAAAAjgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 1365828,
            "raisePct": 42,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 42,
            "completeCells": 169,
            "minimumCellOpportunities": 3804
          },
          "BTN": {
            "n": "/RIAAAcMAAAfDAAA0QsAAFsLAAC7CwAAgAsAAEILAADlCgAAcgsAAMwKAAAXCwAAzQoAAMojAAC1EQAAewsAAHkLAAA1CwAAnAoAAPcKAACCCgAAQAoAAFoKAACECgAARwoAACsKAABIIwAAeiIAAEMRAABiCwAAzwoAAPAKAADMCgAAlQoAAFUKAAAWCgAAWgoAAHkKAACQCgAAfyMAAEYhAACoIAAAsxAAAJ8KAACaCgAAfgoAAEMKAABlCgAASwoAAJYKAAAeCgAAVwoAAPoiAADqIAAAByAAAN0fAACoEAAAXAoAALsKAABbCgAAOwoAABYKAAAxCgAAnQoAAC4KAAAjIgAAqh8AABsgAADMHwAAdx8AAHoPAACGCgAASwoAABkKAACuCQAAmgkAABwKAAADCgAA3iEAAJgfAADRHwAA5x4AAIkfAACSHgAA8Q4AAP8JAADcCQAA/wkAAPwJAACTCQAA7AkAAAAiAACIHwAAcR4AAMweAADfHgAAGR4AANcdAABaDwAA6AkAANwJAACECQAApQkAAJIJAADuIAAAIh8AAEUeAAD1HgAAkR4AABAeAADzHQAALB0AAAoPAADnCQAAvgkAAJIJAACnCQAAJyEAAFQfAAA0HgAAsh0AAG4eAABPHQAAJx0AAAsdAABFHQAA8g4AAPoJAAB4CQAAaAkAAM4gAAAqHwAAER8AAAIeAAARHgAAIB0AAG8dAAA1HQAA/RwAADwdAACJDgAAagkAADMJAAD2IAAArR4AAC8eAAC2HQAArB0AAOEcAAClHAAA1BwAALAcAABPHAAA7BsAAGIOAACpCQAAGCEAAMkeAABKHgAAdR4AADEeAABSHQAA7xwAAGUcAADZHAAA4xsAANAbAACbGwAAgg4AAA==",
            "r": "6APoA94D6APeA94D3gPeA94D6APeA+gD3gPeA94D3gPeA94D3gPeA94D1APUA9QDygPAA94D6APoA94D6APeA94D1APKA6wDogOEA4QD3gPeA94D6APeA94D3gPKA6IDegNSAz4DIAPeA94D3gPUA94D3gPUA8ADhAMCA8YCgAJYAt4DygOsA5gDmAPeA9QDygOYAxYDigIwAv4B3gOEA1wDPgPuAj4D3gPeA7YDZgPQAjAC1gHUA1IDdgJOAv4BMALQAt4DygOYAwwDYgLCAcoD7gLqATYBBAEsAbgBbALUA8oDZgO8AhICygOUApAB0gBuAG4AqgAiAeoB1AOiA+QCHALAA04CXgGgAFAAPABQAHgAyABAAdQD+AImAqwDHAIsAYwAPAAyACgAMgBGAGQAbgDKA/QBmAP0ARgBeAAyAB4AKAAoACgAMgAoACgAwAM=",
            "j": "AAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 875937,
            "raisePct": 64,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 64,
            "completeCells": 169,
            "minimumCellOpportunities": 2355
          },
          "SB": {
            "n": "QQkAAOAFAABKBQAAyQUAAHsFAABVBQAACQUAAGMFAAD7BAAA8wQAADAFAAANBQAAIwUAAEsRAAAKCAAAQwUAADQFAAA9BQAA5AQAAOYEAAD8BAAA7QQAALQEAACqBAAACAUAAPMEAACgEAAAag8AANEHAABlBQAABgUAAA0FAADVBAAA4gQAAKsEAACfBAAAnwQAALoEAACkBAAA/xAAAKAPAAC7DwAA5gcAAOgEAADMBAAA9wQAAH4EAACYBAAAZQQAAF4EAACABAAAlAQAAHQQAACYDwAAGw8AADgPAACdBwAA6AQAAMAEAACkBAAAvwQAAHwEAACHBAAAoAQAAIEEAADTDwAAFA8AAKYOAABTDgAAsQ4AAGAHAACdBAAArgQAAKwEAACmBAAAaQQAAI8EAABSBAAAow8AAGMPAAATDgAA0Q4AALYOAAA+DgAAGgcAAG8EAAB+BAAALAQAAEsEAABiBAAAOgQAAOAPAACzDgAAJQ4AAHsOAABbDgAA9g0AAEMNAAAqBwAAfAQAAGwEAABJBAAAZQQAAIgEAACUDwAAdQ4AAHgOAAA8DgAA4g0AANwNAABfDQAAGQ4AAMAGAAARBAAASQQAAHQEAABmBAAAag8AAPgNAADvDQAA/w0AAGQNAAC9DQAAcg0AAFINAADbDAAApQYAAF4EAABDBAAAHwQAAE0PAAADDgAADA4AAMYNAACFDQAAKw0AAPEMAACcDQAApwwAADANAAAoBgAAKQQAAC0EAAAPDwAAeQ4AAAkOAACQDQAAkA0AAGUNAACKDAAAvQwAAOsMAACjDAAA4gwAAD8GAADqAwAAiA8AAFoOAAD4DQAAsg0AAD4NAABFDQAAsAwAAJwMAABeDQAAUQwAAMgMAAB8DAAALAYAAA==",
            "r": "cAOOA4QDegN6AzQDAgPuAqgCsgKUAooCbAKOA4QDXANIA/gCqAKKAjoCRAIcAiYCHAI6AoQDXAOYA+4CqAJYAiYC9AHWAeAB1gHgAeABcAMgA7ICjgOeAk4C9AHqAdYBwgHqAdYBrgFSA7wCgAJEAnoDMALgAa4BpAGuAbgBuAG4AQIDgAIcAuoBzAFmA/QBmgGaAbgBuAGuAZAB2gI6AvQBwgGGAZABKgPqAZoBuAGkAXwBkAG8Ak4C4AGuAYYBcgFyAdoC1gGuAZoBkAGQAZ4COgLgAYYBXgFeAVQBVAGAAq4BpAGQAZoBigI6AsIBfAE2ASwBNgE2AUoBHAKQAZABkAGAAiYCzAF8AQ4B+gAOARgBLAEsAf4BfAFyAXYCMAKuAV4BDgHwAOYA8AAOAfoADgGuAV4BdgISAq4BVAH6ANIA0gC+ANwA0gDmAMgAmgE=",
            "j": "AAAKAAAACgAAAAoACgAAAAoACgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "eABGAFoAWgBkAKoA3ADwADYBLAFKAVQBcgFQAGQAggCWAOYANgFUAa4BmgHCAbgBwgGaAVoAjABQAPAANgGGAbgB6gEIAvQBCALgAeABZAC+ACwBUABAAZAB6gH0Af4BEgLgAeoBEgKMACIBXgGaAVoArgH+ASYCJgIIAvQB9AHMAdIAXgGuAeoBCAJuAOoBOgI6AggC6gHgAeAB+gCQAcwB/gEmAjACoAD0AToCHAIIAvQB1gEYAXIBpAHWAeoBHAJEAvAACAImAiYC9AHCATYBcgGGAYYBmgHMARICRAJAATACJgIcAuoBSgFeAXwBSgEsAUoBpAHqASYCrgFOAiYCCAJUAV4BXgE2AfoA3AAOAV4BuAEcAsIBRAIcAlQBQAFUASwByACqAKoAyAAsAV4BkAEIAhICVAFUATYBBAG+AJYAjAB4ALQA0gDSAMgAMAI=",
            "opportunities": 401542,
            "raisePct": 50,
            "shovePct": 0,
            "limpPct": 35,
            "rfiPct": 50,
            "completeCells": 169,
            "minimumCellOpportunities": 1002
          }
        },
        "20-30": {
          "EP": {
            "n": "nxEAAMALAACACwAAyQsAAG4LAACgCwAA0wsAAJwLAABHCwAAmgsAAJkLAADzCgAAYAsAAAQjAAAmEgAAowsAALULAAB2CwAAgQsAAFgLAABHCwAAQQsAAIcLAABcCwAAPwsAACcLAAB/IgAAjyIAAAkSAAB5CwAALgsAAHMLAADYCgAAQgsAAPkKAAByCwAADgsAABkLAAAlCwAAEiIAAKkiAACDIgAApREAAGcLAABnCwAAaQsAADELAAC2CwAAJQsAAAELAABNCwAALQsAAKgiAACkIQAAfSEAAHAiAADKEQAAOAsAADALAAA9CwAAKQsAAIoLAAA6CwAAhAsAABALAADoIQAAoSEAAHshAADwIQAARCEAACASAACuCwAA4AoAAD0LAACvCwAAbQsAAKELAAA/CwAAiyEAAKghAACPIgAAbyIAAOghAAAiIgAABhEAADALAAASCwAAGwsAAG8LAAAeCwAA6QoAAIAhAAAAIgAARyEAALUhAAARIgAAWyEAAIUhAACSEQAA6goAACgLAADxCgAAXAsAAPUKAACxIgAAriEAAI0hAABdIgAAxSEAACchAAByIQAAiCIAAE8RAABCCwAARQsAACgLAABrCwAA4yEAABwiAADqIQAA8yEAALQhAABlIgAAtiIAACsiAAAMIgAAABEAAE8LAAA+CwAAgAsAAKIhAAA4IgAAQCEAALghAADAIQAARyEAAAMiAADgIQAAhiEAALghAADTEAAAcAsAAFgLAACpIQAAOyIAAOwhAABSIgAA0yEAAL8hAABqIQAAgiEAALEhAADvIQAAsiIAACoRAAAyCwAA9SEAAC8iAADEIQAA1CEAAIMhAACuIQAArSEAAIkhAADCIQAAzCEAAOQhAAAXIgAAthAAAA==",
            "r": "1AO2A8oDygPKA8ADrAN6AzQDcAM0A/gCsgKsA9QD1APUA7YD0AKQAaoAUAAoAB4AHgAUALYDwAPUA8oDjgNYAvoAFAAKAAoAAAAKAAoA1APQAjYBygOOAyYC5gAeAAoAAAAAAAAAAACEA9IAZABQAKwDigKqABQACgAAAAAAAAAAAJYACgAKAAoACgCiA7gBKAAKAAAAAAAAAAAAMgAAAAAAAAAAAAAAogNAARQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAIQD8AAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAMA4wACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAJgIoAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAEABAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAA=",
            "j": "AAAeABQACgAKAAAAAAAAAAAAAAAAAAAAAAAoAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "FAAKAAoACgAKAAoACgAKAAoACgAKAAoAAAAKAAoACgAKAAoACgAKAAoAAAAAAAAAAAAAAAoAAAAKAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAACgAAABQACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 961202,
            "raisePct": 17,
            "shovePct": 0,
            "limpPct": 1,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 2776
          },
          "MP": {
            "n": "pg4AAM4JAADoCQAAxAkAADIJAAB9CQAAPQkAAHUJAABWCQAALwkAAJwJAABHCQAAQQkAABodAABjDgAAPQkAAJIJAACLCQAA7ggAAIYJAADECAAAZQkAAF4JAABHCQAAIwkAABsJAABkHQAAbBsAACAOAAAsCQAANgkAAHoJAADZCAAAJQkAACcJAACRCAAAyAgAADYJAAAZCQAAgBwAAPsbAABMGwAAAA4AABAJAABpCQAAQQkAAAkJAAAVCQAAPQkAAAUJAAAsCQAA5AgAAOAbAACbGwAA0hsAAJEbAAAbDgAAYwkAAEEJAACkCAAA7AgAAG0JAADzCAAA+wgAAO8IAACtGwAAyxsAACsbAACgGwAACxsAAL4NAAAwCQAA7QgAAJkIAADICAAA5QgAAH0IAADECAAA+BsAAGsbAAApGwAAxhsAAAMbAAArGwAAzw0AAM4IAAD5CAAA7QgAAAAJAADwCAAAHwkAAB0bAADvGgAAJRsAAA0bAACMGgAAchsAAFMbAADwDQAAHwkAAP4IAAAECQAADQkAACwJAAAGGwAAbRsAADIbAAAiGwAAABsAALUaAADmGgAAtBoAAM8NAAAqCQAACgkAANkIAACtCAAAaBsAAD4bAADwGgAAeRsAAJIbAAB1GgAAbhsAAD0aAADVGgAAiQ0AAMQIAADECAAA4AgAAOYbAADAGwAAhRsAAA0bAACOGwAA4xoAANMaAADHGgAACxsAAMQaAACtDQAAoQgAADEJAACfGwAAERsAAKAaAADeGgAApRsAAL4aAACAGgAArRoAAIAaAADqGgAAoBoAAPsNAADLCAAAgBsAAHUbAAADGwAADBsAAKIaAACFGgAALhoAAIUaAABvGgAA0RoAAH0aAACnGgAA8g0AAA==",
            "r": "1APAA8ADygPUA8oDtgOiA3ADogN6A0gDIAO2A94D1APUA8ADSANEAlQByAB4AFAAPAAyALYDygPUA8oDrAPkAq4BUAAeABQACgAKAAoAygNwA0QCygOsA6gCkAFGAAoACgAKAAAACgC2A8wBIgHwALYD+AIsATIACgAAAAAAAAAAAHwBFAAKAAoACgCiA0QCWgAKAAoAAAAAAAAAjAAKAAoACgAAAAoAmAPCATIACgAAAAAAAAA8AAoAAAAAAAAAAAAAAI4DXgEUAAoAAAAAAB4AAAAAAAAAAAAAAAAAAABSA+YACgAKAAAAHgAAAAAAAAAAAAAAAAAAAAAAlAJaAAAACgAUAAAAAAAAAAAAAAAAAAAAAAAAANYBCgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABAAQAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5gA=",
            "j": "AAAUAB4AFAAKAAoACgAAAAAAAAAAAAAAAAAeAAAACgAAAAoAAAAAAAAAAAAAAAAAAAAAAB4ACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "FAAKAAoAAAAAAAoACgAKAAoACgAAAAoACgAKAAoACgAKAAoACgAKAAAAAAAAAAAAAAAAAAoAAAAKAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 771222,
            "raisePct": 20,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 20,
            "completeCells": 169,
            "minimumCellOpportunities": 2173
          },
          "HJ": {
            "n": "VQwAAJsHAACTBwAA3gcAAMoHAACdBwAAcQcAAHMHAAAKBwAAsQcAAJIHAAA3BwAAfQcAAKUXAADXCwAA3gcAAE0HAAB8BwAAnwcAAG0HAABABwAACwcAAB8HAAAZBwAACgcAAD4HAABCFwAAOxYAAIYLAABSBwAASQcAAHcHAAAtBwAAQQcAAEAHAAAnBwAAOwcAAHUHAAAaBwAAiRYAABwWAACdFgAATQsAAGQHAABzBwAAHwcAAAsHAAAzBwAAGAcAAPMGAABNBwAA8QYAAEYXAADKFQAAzBYAAOwWAACmCwAA4QYAAP4GAAAcBwAAXQcAAPkGAAA0BwAAGQcAABYHAACeFgAAbxUAALMVAADIFQAADBUAAMYKAAANBwAAJAcAACIHAADlBgAACAcAAAcHAABdBwAAwxUAAI0VAADDFQAAWhUAAD4VAAAfFQAABgsAABEHAADLBgAAPQcAACAHAAAJBwAA1QYAAOIWAADPFQAAlRUAAHsVAAB4FQAAnhQAAOoUAAAGCwAAAwcAAGUHAABJBwAADgcAABgHAAAFFgAAwxUAADEVAAAkFQAAOxUAAEQVAADsFAAAFhUAAMYKAADgBgAA6gYAALwGAADoBgAA7BUAAJwVAABIFQAAixUAAAwVAAAjFQAApBQAAHQUAADnFAAAiwoAAN8GAADZBgAAJQcAAMEVAAB8FQAAVBUAAD8VAAAMFQAARxUAAFEVAADjFAAA9xQAAHAVAABwCgAAsgYAANQGAADyFQAA2xUAAK4VAACZFQAAYBUAAL0UAADUFAAAthQAAC0VAACNFAAABRUAAKIKAADlBgAA0hUAAIAVAABQFQAAFhUAAEQVAABuFAAAfhQAADUUAABpFQAAwRQAAAgVAAAVFAAAPgoAAA==",
            "r": "1APAA8ADygPKA8oDygPAA7YDwAOsA6IDegPAA94DygPUA8oDogMMA2wC1gFyASIB3AC0AMAD1APUA8oDwAN6A54CGAF4AFAAPAAoACgAygO2A0gD1APAA0gDgALmACgAKAAUAAoACgDKA/gCWAL0AbYDcAMIArQAKAAKAAoACgAAANACeAA8ACgAPACsA9AC+gA8AAoAAAAAAAAA6gEeABQACgAKABQAmAOKAqAAHgAKAAoAAAD6ABQACgAKAAoACgAKAI4D9AE8ABQACgAKAGQACgAAAAAAAAAAAAAACgBwA4YBKAAKAAAAbgAKAAAAAAAAAAAAAAAAAAoADAO+ABQACgBGAAoAAAAAAAAAAAAAAAAAAAAAAHYCKAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAD+AQoAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmgE=",
            "j": "AAAeAB4AFAAUAAoACgAKAAoACgAAAAoAAAAeAAAAFAAKAAoAAAAAAAAAAAAAAAAAAAAAAB4ACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "CgAAAAoACgAAAAoAAAAKAAAAAAAKAAAACgAAAAoACgAAAAoACgAKAAoAAAAAAAAAAAAAAAoAAAAKAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 609062,
            "raisePct": 25,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 25,
            "completeCells": 169,
            "minimumCellOpportunities": 1714
          },
          "CO": {
            "n": "5QkAAAAGAABbBgAAKAYAABYGAAAdBgAAIQYAAOIFAADcBQAA0AUAAKcFAADVBQAAsAUAABUTAABCCQAAFAYAALcFAAC9BQAA9gUAAKgFAACSBQAAlQUAAJ0FAACxBQAAlwUAAJQFAACCEgAAlBEAAA0JAACbBQAA+AUAAK8FAAC8BQAAZQUAAKgFAAAzBQAAfgUAAJMFAABcBQAAoxIAAFYRAAAwEQAADAkAAJcFAACFBQAArwUAAJsFAAB0BQAARwUAALIFAABTBQAAkAUAAEsSAAAuEQAAHREAAAQRAACvCAAAvQUAAIgFAACSBQAAeQUAAGgFAABDBQAAhgUAACkFAAAlEgAAVhEAACMRAAAuEQAAcxAAAMUIAAClBQAATAUAALUFAABhBQAAYAUAAHwFAAA1BQAAgREAALgQAACjEAAAqhAAAM0QAAA/EAAAewgAAJ0FAAB+BQAAWgUAAFYFAAAcBQAAcQUAAN0RAAD+EAAAMhEAAMsQAAA7EAAAbBAAAIEQAABaCAAAhgUAAFkFAAA5BQAAWQUAAD8FAABIEQAA0RAAAN8QAAA/EAAAoRAAAFsQAAAZEAAAlA8AAEAIAABwBQAAYwUAAEYFAAA8BQAA6hEAAN4QAAD1EAAAhhAAALsQAABbEAAAMxAAAPIPAACcDwAABwgAAEgFAACsBQAAYwUAAEQRAACaEAAAWRAAAGgQAAAwEAAAPxAAAFwQAADgDwAAsA8AABoQAAAPCAAAMAUAACcFAAAKEQAAkhAAALcQAAD+DwAAexAAAOIPAAArEAAAww8AAMgPAAB2DwAAPhAAAA4IAABEBQAAQBEAAH0QAABYEAAAFRAAAHsQAAAzEAAABxAAAGQPAAAZEAAAPg8AAJcPAAA7DwAAxgcAAA==",
            "r": "3gO2A8oDygPAA8ADwAPKA8ADygPAA8oDtgPAA94DwAPAA8ADwAOiA2YDDAPGApQCTgLqAbYDygPeA8ADwAO2A2YDgAIIApABVAEiAeYAwAPKA7YDygPAA5gDXANYAhgBvgCqAHgAWgDAA6IDXAMqA8ADrAMCAwgC3ABGADIAHgAeAJgDJgKQAUABQAGsA2YDOgIEAVAAKAAUAB4AXAP6ALQAoABkAIIAjgM0A9YBqgAyABQAFADkAowAKAAeABQAHgBGAHoD0AIOAWQAHgAKAFgCPAAUAAoACgAKABQAKABmA3YCqgAyABQATgIoABQACgAAAAAACgAKABQANAOkAUYAFAD+AR4ACgAAAAAAAAAAAAAACgAKAPgCggAeAJABHgAKAAAAAAAAAAAAAAAAAAAACgCUAh4AVAEUAAoACgAAAAAAAAAAAAAAAAAAAAAATgI=",
            "j": "AAAeABQAHgAeAB4AFAAKABQAFAAKAAoACgAoAAAAHgAeAB4ACgAAAAoAAAAAAAAAAAAAACgAFAAKABQAFAAAAAAACgAAAAAAAAAAAAAAKAAKAAoACgAUAAoACgAAAAAAAAAAAAAAAAAeAAoACgAAAB4ACgAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAyAAoAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAUAAKAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAFoACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABkAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG4AAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABkAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAA=",
            "l": "CgAKAAAAAAAAAAAACgAKAAoAAAAKAAAACgAAAAoACgAKAAoACgAKAAAACgAKAAoACgAKAAAAAAAAAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 471757,
            "raisePct": 34,
            "shovePct": 1,
            "limpPct": 0,
            "rfiPct": 35,
            "completeCells": 169,
            "minimumCellOpportunities": 1308
          },
          "BTN": {
            "n": "dgcAAJkEAAClBAAA2wQAAH8EAAB6BAAAawQAAH4EAABHBAAAdwQAAFAEAAApBAAATQQAAEkOAAB7BgAAgAQAAFUEAABxBAAADwQAAEIEAAALBAAAGQQAABEEAAAhBAAAKQQAAMADAADXDQAANQ0AAKIGAAA8BAAAUQQAAL4DAAAfBAAAFgQAAPIDAABABAAAIgQAABcEAAC/AwAA8g0AABgNAABdDQAAnQYAAE4EAADXAwAAHAQAAEEEAAD6AwAAKQQAADUEAAADBAAA/gMAAKQNAADrDAAA6gwAAF4MAACxBgAAAAQAAAgEAAAVBAAAAAQAADUEAADkAwAADgQAANQDAACBDQAAtgwAAGIMAAC6DAAAqAwAAFMGAAARBAAAxgMAAPIDAAAwBAAAAgQAAOkDAADNAwAATg0AADAMAADMDAAAOgwAAEsMAACoCwAAGgYAAMEDAAC2AwAA9wMAALwDAAD7AwAAtAMAAF4NAABWDAAAbwwAAOILAADVCwAAwgsAANULAABCBgAAAwQAAKgDAADfAwAAtAMAAMcDAAASDQAAUQwAAHcMAADOCwAA8QsAABwMAACICwAAwAsAAOoFAAC/AwAAqQMAANEDAAC5AwAAOw0AAMEMAAAZDAAAQgwAAOALAADfCwAAiQsAAFMLAADYCgAA2wUAAKkDAACwAwAAuwMAAEQNAAAXDAAAaQsAAPALAAC8CwAApwsAABwLAACOCwAAFgsAACALAADGBQAApwMAAJQDAAC8DAAA/gsAAMcLAAD3CwAAtQsAAMsLAAAkCwAAVgsAAD4LAAAOCwAAJgsAAM4FAACIAwAA6wwAAPYLAADFCwAA3gsAAFQLAACVCwAAZAsAADsLAAA7CwAA0AoAAFULAACjCgAAygUAAA==",
            "r": "3gPKA8oDwAO2A6IDrAOiA6IDjgOOA44DhAO2A94DrAOiA5gDtgOsA6wDrAOYA5gDegNcA7YDrAPeA5gDogOsA6wDhANSAz4DIAMCA9ACrAO2A7YD1AOOA6wDrANwAwIDngKUAjoCMAKiA6wDrAOYA7YDmANwA1ID2gIIArgBfAFKAZgDegM0AwID2gKYA4QDSAPGAhICpAFKATYBjgMMA4oCbALqASYCcANmAz4DbALCATYBGAGEA54CpAFyATYBQAG4AUgDegOoAhICaAHmAHoDJgI2AcgAoACqAAQBcgECAz4DOgKaASwBcAPCAfoAggBGAEYAbgCWABgBxgLQAsIBSgFmA4YB3ABkADIAMgAyAEYAZACqALwC4AEsAT4DaAHIAGQAKAAeAB4AKAAyADwARgCoAkABIANAAaoAUAAeAB4AHgAeABQAHgAeAB4AdgI=",
            "j": "AAAeAB4AKAAoADwAMgA8ADIAUABGAFAAUAAoAAoAMgAyADwAHgAoABQACgAKAAoACgAKADIAPAAKADwAMgAeABQACgAKAAAAAAAKAAAAMgAoAB4ACgA8AB4ACgAKAAAAAAAAAAoACgA8AB4AFAAUACgAHgAeAAoACgAAAAoAAAAKAEYACgAKAAAAAABGAB4ACgAAAAAAAAAAAAAARgAKAAoAAAAAAAAAeAAUAAoAAAAAAAAAAABGAAoAAAAAAAAAAAAAAJYACgAKAAoAAAAAADIAAAAAAAAAAAAAAAAAAADSAAoACgAAAAAAPAAKAAAAAAAAAAAAAAAAAAAABAEKAAoAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAQBCgAAADIACgAAAAAAAAAAAAAAAAAAAAAAAAAEAQAAKAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AA=",
            "l": "CgAAAAAAAAAKAAAAAAAKAAoAAAAKAAoACgAAAAAACgAUAAoACgAKABQACgAKAAoACgAKAAAAAAAAABQACgAUABQAFAAKAAoAFAAKAAoAAAAAAAoAAAAUABQAFAAUAAoAAAAKAAoAAAAAAAoACgAKAAAAHgAeAB4ACgAAAAAAAAAAAAAAAAAAAAoACgAAACgAFAAKAAoAAAAAAAAAAAAAAAAAAAAAAAoAAAAoABQAFAAKAAoAAAAAAAAAAAAKAAAAAAAAAAoAHgAUAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAB4AFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 343588,
            "raisePct": 53,
            "shovePct": 2,
            "limpPct": 0,
            "rfiPct": 55,
            "completeCells": 169,
            "minimumCellOpportunities": 904
          },
          "SB": {
            "n": "mgQAAO8CAAD3AgAA6gIAAOwCAADXAgAA2gIAAJoCAADAAgAAeAIAAIgCAACjAgAAeAIAAMAIAAACBAAAxAIAAIICAABXAgAAeQIAAIACAACRAgAAZAIAAGECAABxAgAAcQIAAGACAACUCAAARAgAAPIDAAB7AgAAewIAALICAAB1AgAAjAIAAHYCAAB+AgAAOAIAAFUCAABFAgAAmwgAAMAHAAB8BwAAuAMAAJECAAA8AgAAawIAAG8CAABiAgAANwIAAEYCAABSAgAAKQIAAJoIAAAJCAAAoAcAAHYHAADkAwAAZwIAAFICAABZAgAAUgIAAGsCAACTAgAALgIAACICAACMCAAAxwcAAGgHAABqBwAAPQcAAM0DAABsAgAAawIAAFYCAAA1AgAAMwIAADwCAAA5AgAAFQgAAD4HAABRBwAAZwcAACoHAABzBwAAaQMAADICAAAtAgAAYgIAAEUCAAAiAgAAOQIAAB8IAADcBwAAKAcAAEEHAAAPBwAAHQcAAPgGAAA8AwAAHQIAAG8CAABdAgAAKAIAAEQCAAD/BwAADgcAACQHAAA4BwAA9gYAAOcGAADxBgAAxQYAAFUDAABBAgAAPQIAAFkCAAAkAgAAEQgAACoHAADoBgAAPQcAADIHAADaBgAAgwYAAJsGAAB+BgAAIQMAABkCAAAYAgAAWgIAAP4HAABkBwAAKgcAANwGAAD2BgAA9AYAAMAGAACvBgAAjwYAAIoGAAARAwAAFwIAABwCAAAWCAAALgcAABMHAADLBgAAkQYAANAGAAC4BgAAYQYAAFUGAAA1BgAAeQYAAB0DAAAVAgAAvgcAABkHAAAZBwAAEwcAAMoGAADEBgAApAYAAIgGAACXBgAAQwYAAFUGAABaBgAAOAMAAA==",
            "r": "+AL4AvgCxgJsAhwCuAHCAYYBcgFeAV4BQAHaAjQDigI6AsIBpAGQAXIBQAFUAWgBkAFoAcYCYgI+A8wBpAGQAWgBQAE2AUABcgEsAVQBigISAswBDAN8AVQBVAE2AUoBhgFKAXIBIgEcAsIBrgGGAe4CXgEiASIBSgE2AV4BQAFUAcIBuAGQAV4BSgGKAhgBLAEOAUABSgFeASwBpAG4AYYBXgE2ASwB9AEiAfoAIgFAATYBIgGQAbgBhgFoASwBLAEiAYYBIgEiARgBLAFAAXIBwgGQAVQBLAEiARgBDgEOARgBDgEiAUABaAG4AYYBVAEEAQ4BDgEYAQ4ByAAOASIBNgF8AbgBcgFKAQ4BDgHwAPoAGAEOAZYA8AAYAWgBuAFoAUAB8ADmAPAA5gDmAAQB8ACgABgBfAHCAXwBNgHwANwAyAC+ANIA3ADcAMgAlgA=",
            "j": "AABGAEYAggCWALQA0gDSANwA3ADIANIABAFkAAoAbgB4AG4AggBkAGQAWgBQAEYAPABGAHgAlgAUAIwAbgBQAEYAKAAoAB4AHgAoAB4AoACWAG4AFACWADwARgAeAB4ACgAKABQACgDSAIIAUABGAFoAeAAoACgAFAAKAAoAAAAKAAQBRgAeABQAHgCMAGQAHgAUAAoACgAKAAoADgEyABQAFAAKABQA+gBQAB4AFAAKAAAACgAEAR4ACgAKAAoACgAKADYBRgAoAAoAAAAKAPoAKAAKAAoAAAAKABQACgCaASgACgAKAAoA5gAeAAoACgAAAAAAAAAAAAoApAEUAAoACgDcAB4ACgAAAAAAAAAAAAAAAAAKAMwBCgAKAOYAFAAKAAAAAAAAAAAAAAAAAAAAAADCAQoA0gAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAzAE=",
            "l": "5gCqAKAAoADcAA4BVAFUAXwBkAG4Aa4BmgGgAKoA5gAsAa4BuAHqAQgCOgI6AjACCAImAqoA8ACWAIYB1gH+ATACdgJ2AmwCOgJsAkQCtABAAaQBvgDWAU4CRAKKAmwCMAJiAhwCbALwAJoB4AESAqAAEgKUAooCbAJiAjoCJgIIAhgB1gEmAk4CYgLSAGIClAKoAmwCRAISAhICLAHgARwCOgJiAnYC+gBsAsYCigJEAjAC6gFKAeAB1gH0ARICMAJsAiwBdgKAAoACTgLCAWgBrgGkAXIBhgHCARwCYgJAAZ4CqAJsAhIChgGaAXwBSgEYATYBkAHgAUQCfAGoAoACMAJ8AZoBcgEiAdIAtADmADYBkAH0AYYBqAIwAoYBkAFUAfoAvgCWAJYAqgD6ACIBaAF8AToCfAFeASwB5gCqAIIAggBuAIwAoAC0AJYAfAE=",
            "opportunities": 203445,
            "raisePct": 37,
            "shovePct": 7,
            "limpPct": 39,
            "rfiPct": 44,
            "completeCells": 169,
            "minimumCellOpportunities": 533
          }
        },
        "15-20": {
          "EP": {
            "n": "/QgAAIgFAAB7BQAAXwUAAFAFAABWBQAAfwUAAJcFAABZBQAAMwUAAHIFAAATBQAALQUAALEQAABfCAAAZgUAAG4FAABZBQAAXQUAAHoFAAA3BQAAKgUAAD8FAAALBQAANQUAAFQFAACQEAAA9w8AAGMIAABlBQAAPwUAAKwFAAA3BQAAiQUAACoFAABPBQAApgUAADAFAAAXBQAAwBAAABsQAADADwAAoggAAGEFAACcBQAAKQUAAGIFAABHBQAAhQUAAC0FAABIBQAAGAUAAE0QAAD3DwAAww8AAKoPAABVCAAADwUAAEAFAABCBQAAgQUAAEgFAABKBQAANQUAAEwFAAAIEAAAhw8AAGgPAADfDwAA0w8AAH0IAABiBQAAaAUAADgFAABtBQAANwUAADQFAAB0BQAAIBAAAB8QAAAkEAAA8A8AAPcPAAAvEAAAJAgAAJoFAABSBQAAbAUAAEYFAAA8BQAAUgUAAMYPAACdDwAA/w8AAFEQAACvDwAAhg8AABwQAABPCAAAVgUAAGgFAABWBQAASAUAAHoFAADNDwAA6A8AALwPAABdEAAAsA8AAK8PAABzEAAA9g8AAP8HAACkBQAAOQUAAB0FAAA5BQAAyQ8AAKcPAACiDwAAog8AAMoPAAD9DwAA0g8AAOUPAADWDwAAHAgAAH4FAAAoBQAAigUAAPMPAAD6DwAArA8AAN4PAAA1EAAAbBAAAJIPAAC2DwAAORAAAO4PAAD4BwAAUwUAACIFAADbDwAA4g8AAGgQAABoDwAA6A8AAA8QAADpDwAAwQ8AADMQAACFDwAATxAAAPsHAAD7BAAAsQ8AAEEQAAAtEAAAMxAAACEQAACIDwAAaBAAAAkQAAC9DwAAzQ8AAEQQAAAQEAAAaggAAA==",
            "r": "ogP4Au4C+AIgAyAD+AKAAiYCYgIcAuABhgGoApgDSANIAwwDmgGgAEYAFAAUAAoACgAKAJ4CNAOEAzQDxgIOAVoACgAKAAAAAAAAAAAAAgPqAZYADAOeAtwAUAAKAAAAAAAAAAAAAADGAloAKAAeAIACQAEyAAoAAAAAAAAAAAAAAFoAAAAAAAAAAABsAqAACgAKAAAAAAAAAAAAFAAAAAAAAAAAAAAAWAJuAAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAAADACRgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAACQATIAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAA3AAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "j": "FADcANwA3ACgAFAAMgAeAB4AKAAKAAoACgAiASgAggBaACgACgAKAAAAAAAAAAAAAAAAADYBRgBGADwAFAAKAAAAAAAAAAAAAAAAAAAAvgAUAAAAvgAoAAoAAAAAAAAAAAAAAAAAAABQAAAAAAAAAEoBCgAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAABUAQAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAXgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "KAAKABQACgAUABQAFAAeABQAFAAUABQAFAAUAB4ACgAUACgAFAAKAAoACgAAAAAAAAAAAAoACgAUAB4AKAAKAAoAAAAAAAoAAAAAAAAACgAKAAoAFAA8ABQACgAAAAAAAAAAAAAAAAAKAAAAAAAAABQAHgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 452511,
            "raisePct": 12,
            "shovePct": 2,
            "limpPct": 1,
            "rfiPct": 14,
            "completeCells": 169,
            "minimumCellOpportunities": 1275
          },
          "MP": {
            "n": "DgcAALsEAABpBAAAPgQAAHkEAABZBAAAhwQAAEYEAABXBAAAMQQAAEwEAAA4BAAAagQAAEcNAAC2BgAAfgQAAEIEAAASBAAAUQQAAFAEAABVBAAAZwQAABMEAAA8BAAARwQAAOwDAAA8DQAABg0AAMgGAACdBAAALgQAAGsEAABhBAAAOgQAAEcEAABBBAAA/AMAACUEAAAtBAAAgg0AAJcMAADhDAAArAYAAHoEAAAwBAAAFwQAABAEAAAtBAAA+gMAADQEAAAZBAAAGgQAAFwNAAAbDQAAyAwAAOQMAABzBgAAVgQAADoEAACIBAAAQwQAADYEAAA/BAAADAQAADoEAACRDAAAoQwAAPsMAACfDAAApQwAAM0GAAAWBAAAOwQAABsEAAA2BAAAPwQAAHYEAAAbBAAAPQ0AAG4MAAC5DAAAYgwAAJEMAACnDAAAhgYAAGIEAAAfBAAAOAQAAOgDAABHBAAAOAQAAL0MAAD9DAAAPgwAAM0MAACTDAAAWQwAAMsMAABrBgAAMgQAAB8EAAAnBAAAFgQAACsEAACODAAAtwwAALQMAACuDAAAnAwAAOkMAABDDAAAngwAAHUGAAAjBAAALQQAAB8EAAArBAAAtgwAAD0MAADJDAAAiQwAANYMAACfDAAA7AwAAFkMAACjDAAAYAYAAB0EAAA3BAAAIAQAAKgMAABiDAAAbgwAAJAMAADIDAAAYAwAACYMAACYDAAAiAwAAGoMAAApBgAAJwQAACYEAADaDAAAjAwAALUMAACVDAAApAwAAHoMAAAdDAAAmgwAAHEMAABxDAAAaQwAAAwGAADbAwAAbAwAAI4MAABVDAAAvAwAAJAMAAAUDAAAqAwAAOIMAACvDAAAeAwAABsMAACdDAAABwYAAA==",
            "r": "rAMCA+4C5AIgAyADFgPaAooCqAJ2AjoC9AG8AqwDNAM0Az4DJgIYAaAARgAoABQAHgAUAJ4CPgOEAzQDDAOaAaoAFAAKAAAAAAAAAAAA7gKUAkABIAPuAnIBoAAUAAAAAAAAAAAAAAD4AtwAbgBQAKgCwgFkAAoACgAAAAAAAAAAAOYACgAKAAAAAABsAvoAFAAKAAAAAAAAAAAARgAAAAAAAAAAAAAAOgK0ABQAAAAAAAAAAAAUAAAAAAAAAAAAAAAAABwCggAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAADWAUYACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAANgEUAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAALQACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgA=",
            "j": "FADSAOYA8ACqAHgAUABGAB4AKAAoABQAFAAYAR4AlgCCAEYACgAKAAAAAAAAAAAAAAAAADYBZABQAFoAMgAKAAAAAAAAAAAAAAAAAAAA5gAoAAoAtAAyAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAACIBFAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAABeAQoAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAfAEKAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAHwBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAQAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "l": "HgAKAAoACgAKAAoAFAAKABQAHgAUAAoAFAAKAB4AFAAUAB4AHgAKAAAAAAAAAAAAAAAAAAoAFAAUACgAKAAUABQAAAAAAAAAAAAAAAAACgAKAAoACgAyABQACgAAAAAAAAAAAAAAAAAKAAoAAAAKABQAKAAKAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAUABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AFAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 358471,
            "raisePct": 14,
            "shovePct": 3,
            "limpPct": 0,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 987
          },
          "HJ": {
            "n": "uQUAALwDAACAAwAAjgMAAHoDAAB5AwAAVQMAACQDAAB0AwAAcgMAAGsDAABsAwAAaQMAADsLAABjBQAAYwMAAFMDAABXAwAAdAMAAHsDAABGAwAAjgMAAEADAABIAwAAWQMAAIQDAAB1CgAABQoAAE8FAABwAwAAewMAAEIDAABHAwAAWAMAAEkDAABGAwAASwMAAFYDAABJAwAAvwoAAHAKAABICgAAJgUAAF0DAAB0AwAAIQMAAFMDAABvAwAATgMAAEUDAABsAwAAVwMAALkKAAC4CQAA3QkAABMKAABRBQAANgMAADUDAABQAwAAJAMAAEQDAABHAwAARwMAAGUDAACKCgAA1AkAAHwJAADkCQAAKAoAAPQEAAA4AwAALAMAADwDAABVAwAANQMAAC0DAABRAwAACgoAADMKAAAoCgAA8AkAANsJAADmCQAA/wQAAHUDAAArAwAAGwMAABgDAAAVAwAANAMAABoKAADtCQAA9AkAAKsJAABZCgAAgAkAAN0JAAAOBQAAFQMAAAUDAAAHAwAAGQMAABEDAABrCgAA1QkAAJsJAAC1CQAA0AkAANYJAABvCQAAoAkAACgFAAApAwAASgMAAEYDAAADAwAABQoAAPUJAADmCQAAVgkAAMwJAAD4CQAAywkAALcJAABzCQAABAUAADMDAAA2AwAAKgMAAKsKAAAACgAAwgkAAGsJAADMCQAAmAkAAKsJAACpCQAA8AkAAJEJAACyBAAAKQMAACQDAAAOCgAArgkAAM8JAACoCQAA0wkAAGEJAADMCQAAoAkAAEkJAACTCQAAegkAAM0EAABLAwAACwoAAPMJAADvCQAAhwkAAN0JAABwCQAAmQkAAKYJAACgCQAAfgkAAHcJAABSCQAAoQQAAA==",
            "r": "wAMCAwID0ALQAvgCKgP4AuQC2gLQAqgCdgKyAqwDDAMMAzQDngLWAUABvgB4AFoARgBGAKgCIAOEAwIDIANEAmgBeAAeABQAFAAUABQAqAICAxwCIAMCAwgCVAFkAAoACgAKAAoACgDaAtYBQAHmALwCOgLmADwAFAAKAAAAAAAAANYBPAAeABQAFABOAqQBUAAUAAAACgAAAAAAGAEKAAoACgAKAAoACAIiATIACgAKAAAAAACCAAoAAAAAAAAAAAAAAOABvgAeAAoAAAAAACgACgAAAAAAAAAAAAAAAADCAYIACgAKAAAAPAAAAAAAAAAAAAAAAAAAAAAAcgFQAAoAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAQBCgAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAADSAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjAA=",
            "j": "FADSANwABAEEAcgAggCMAGQAeABQADwAKAAiAR4AyAC+AG4AMgAUAAoACgAKAAAAAAAAADYBoABQAKAAWgAeAAoAAAAAAAAAAAAAAAAALAFQAB4AtAB4ABQACgAAAAAAAAAAAAAAAADmABQACgAKABgBKAAKAAAAAAAAAAAAAAAAAG4AAAAAAAAAAACGARQAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAwgEKAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAANYBCgAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAACuAQoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAXgEAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAQBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgA=",
            "l": "FAAKAAoACgAKAAoACgAKAAoAFAAUABQAFAAKABQACgAUABQAFAAKAAoACgAAAAoAAAAAAAoACgAKAB4AKAAUAAoAAAAAAAAAAAAAAAAACgAKAAoACgAyAB4ACgAAAAAAAAAAAAAAAAAAAAoACgAAAAoAPAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAABQAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 279637,
            "raisePct": 17,
            "shovePct": 4,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 771
          },
          "CO": {
            "n": "WwQAAAIDAADKAgAAyAIAAN4CAADGAgAAvAIAAKcCAADBAgAAlwIAAIgCAACvAgAAqAIAAA8JAAAGBAAAmgIAANwCAACRAgAAjwIAAJsCAAB7AgAAmwIAAJsCAACyAgAAegIAAK4CAACeCAAA/QcAABUEAADEAgAAdwIAAKECAADBAgAAiwIAAHYCAACFAgAAngIAAHkCAABOAgAAgQgAAAsIAADYBwAAHwQAAMICAACOAgAAegIAAKYCAABqAgAAogIAAH0CAABxAgAAXAIAAEgIAADABwAAOQgAANIHAAD5AwAAfwIAAHUCAAC7AgAAiAIAAIECAABzAgAAkQIAAGwCAABLCAAAngcAAK4HAADhBwAA+gcAAP0DAACcAgAAiAIAAGcCAACHAgAAYgIAAHsCAABrAgAAEwgAALoHAABbBwAAeQcAAFUHAAA3BwAAjgMAAIYCAAB4AgAAiQIAAIACAABrAgAAOwIAAC4IAAB2BwAANwcAAPQHAACbBwAAeQcAAKAHAADeAwAAZgIAAGYCAABaAgAAdQIAAG8CAAAVCAAAmQcAALkHAABoBwAANgcAAF8HAABBBwAAFAcAAJMDAAB+AgAAggIAAHMCAACEAgAAsQcAALoHAABtBwAAngcAAIEHAACUBwAAVgcAAD4HAAAsBwAAkwMAAGECAAB8AgAAgwIAAAYIAAC2BwAApAcAAKcHAABmBwAAlwcAADgHAABOBwAAPwcAAFsHAACfAwAASgIAAEUCAADNBwAAiQcAAD8HAAB0BwAApQcAAJ4HAAA9BwAAOwcAAE8HAABVBwAAIAcAALYDAAB1AgAAEQgAAHkHAAB9BwAAaQcAADoHAABUBwAAPAcAADoHAAD7BgAAUwcAANAGAABrBwAAkwMAAA==",
            "r": "wAMWA/gC+AKeAqgCqALQAtACsgK8ArwC0ALGArYDxgKeArwC7gLGAmwC4AF8AWgBIgEOAbICvAKiA8YC0ALuAmICXgHmAKoAlgB4AFoAgAL4Au4CSAPaArICJgI2AW4AUAAyADwAKACAArwCTgL0AdoCqAKuAdwAWgAeAB4AFAAUAGICIgGgAIIAbgB2AjoCDgFkAB4AFAAUABQAOgJ4AFAAPAAoACgAJgLCAb4APAAUAAoAAADgAVAAHgAUAAoACgAeAMIBcgFuACgACgAKAFQBHgAKAAoAAAAKAAoAFABoASIBUAAUABQAVAEeAAoACgAAAAAACgAKAAoAfAGCAB4AFAD6ABQACgAAAAAAAAAAAAoAAAAKACwBKAAKAMgACgAKAAAAAAAAAAAAAAAAAAAAAAAEAQoAoAAUAAoAAAAAAAAAAAAAAAAAAAAAAAAA3AA=",
            "j": "FADIAOYA5gA2ASwBGAHwAOYA+gDcANIAlgAYASgADgE2AQQBggA8AB4AHgAUABQACgAKACwBDgE8AAQB0gBGACgACgAAAAAAAAAAAAoAVAG0AFoAlgC0AEYAKAAAAAAAAAAAAAoAAABUAVAAKAAoAAQBeAAeAAoACgAAAAAAAAAAABgBFAAKAAoACgBoATwACgAAAAoAAAAAAAAA0gAKAAAAAAAAAAoArgEyABQACgAAAAAAAACMAAAAAAAAAAAAAAAAABICHgAAAAAACgAAAGQAAAAAAAAAAAAAAAAAAABOAhQACgAAAAAAZAAAAAAAAAAAAAAAAAAAAAAACAIKAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAOABCgAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAACQAQAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANgE=",
            "l": "FAAKAAoAAAAKAAoACgAKAAoACgAUABQACgAKAAoACgAKABQAHgAKAAoACgAKAAoACgAKAAoACgAKAAoAKAAeAB4ACgAKAAAAAAAAAAAACgAKAAoAAAAoAB4AHgAKAAAAAAAAAAAAAAAAAAoACgAKAAAAMgAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKADIAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAoAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAKAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 215141,
            "raisePct": 22,
            "shovePct": 7,
            "limpPct": 0,
            "rfiPct": 29,
            "completeCells": 169,
            "minimumCellOpportunities": 571
          },
          "BTN": {
            "n": "iAMAAD0CAABIAgAARwIAAEoCAABGAgAAKAIAAPMBAAAlAgAADAIAABQCAAAlAgAACAIAAA0HAABOAwAAJwIAABACAAAcAgAACgIAAMcBAAABAgAA+gEAAAsCAADCAQAA7AEAAO4BAADdBgAAawYAAEgDAAAdAgAAKAIAABYCAAD2AQAAFgIAANMBAAD/AQAAAQIAANYBAADqAQAAMAcAAHEGAABMBgAAMAMAAPYBAAAGAgAA5wEAABwCAADpAQAA+QEAAO8BAADfAQAA+AEAAHgGAABRBgAAEgYAAOYFAAAqAwAAHwIAAAoCAADtAQAA3wEAAOUBAAD4AQAA5gEAAPcBAABtBgAASAYAADcGAAAcBgAA5QUAANcCAAD8AQAABwIAAAMCAADYAQAA0gEAAPABAADYAQAAYwYAAEoGAACvBQAAJgYAAOsFAAC2BQAA+wIAAOMBAADDAQAA8AEAALoBAADnAQAA2AEAAJgGAADuBQAA0gUAALAFAACqBQAAzAUAAMYFAAD9AgAA9gEAAMIBAADIAQAA8QEAALUBAAA8BgAAowUAAN0FAAD+BQAA5gUAAKAFAADDBQAAjAUAALsCAADMAQAA7wEAAOYBAAC+AQAANQYAAOEFAADtBQAApwUAALIFAAB3BQAAeQUAAHUFAACEBQAAyAIAAMUBAADxAQAAzgEAAAkGAAD4BQAAxwUAAIgFAACcBQAAjwUAAOMFAACOBQAAUAUAAEkFAADBAgAA2AEAALEBAAA/BgAAugUAAHUFAACiBQAAggUAAJIFAABVBQAAYgUAAH4FAAA8BQAAcgUAANICAADVAQAABgYAALgFAAAaBgAArwUAAJYFAACrBQAAgAUAAE0FAABwBQAAWgUAAEEFAABrBQAA2AIAAA==",
            "r": "wAMMAz4D7gKKAkQC9AESAjoC/gH0ARwCMALuAsADqAJsAggCigKeArICngKAAoACdgJOAtoCWAKsAzACOgK8AtoCigI6AhICHALgAa4BigJiAqgCegMwArwCxgJYAq4BmgGGAUABQAE6ArICngKUAhYDgAJOAggCpAEOAfoA5gDcAPQBgAISAuABwgGeAjoCJgJyAQQB5gC0AKAA4AHqAZABVAEYASIBHAJYAuoBSgH6AKoAoAD+AXwB8ADcAKAAvgDmAKQBEgJyAfAAtACMAOoBQAGgAHgAWgBkAIwAyABKAfQBNgHIAIwA/gEEAYIAUAAyADIAUABQAHgA5gB8AdwAqgD0AeYAeABGACgAHgAeACgAPABuANwA8ACqAPQB0gBkAEYAHgAeAB4AFAAeAB4AKADcAIwA1gHIAG4AMgAeABQACgAUAB4AHgAUABQA0gA=",
            "j": "FADSAKAA+gBeAZAB4AHCAaQB1gHWAa4BkAHwABQALAFyAbgBNgHwALQAlgBuAGQAUABaAA4BhgE8AJABcgHSAIIAZAAoADwAKAAoAB4AVAFyAQQBZAByAbQAeAA8ABQAHgAeAB4AFACkAfoAoACMAMgA8ACCADIAHgAUAAoAFAAKAOABZAA8ACgAKAA2Ab4ARgAeAAoACgAUAAAA6gE8AB4AFAAKABQAwgGMADwAFAAKAAoACgC4ATIACgAKAAoACgAKADoCeAAeAB4ACgAKAJABKAAKAAAACgAAAAoACgCUAkYAHgAUAB4AaAEeAAoAAAAKAAoAAAAAAAoA7gIyABQACgBKAR4ACgAKAAoAAAAAAAAAAAAAANoCFAAKADYBFAAKAAAAAAAAAAAAAAAKAAAAAACoAgoABAEKAAoAAAAAAAAAAAAAAAAAAAAAAAAAdgI=",
            "l": "FAAAAAAAAAAAAAoACgAKAAoACgAKABQAFAAAAAoACgAKAB4ACgAyAB4AHgAoACgAFAAeAAAAAAAAAB4AKAA8ADIAHgAoAB4AHgAKAAoAAAAKAAoACgAyADwAKAAeABQACgAKAAoACgAAAAoAHgAeAAAARgBGADIAFAAAAAoAAAAAAAAACgAKAAoACgAKAFoAKAAUAAoACgAAAAAAAAAAAAoAAAAKAAoAAABQADwAFAAKAAoAAAAAAAAACgAAAAAAAAAKAAAAUAAeAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAKADIAFAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 165860,
            "raisePct": 33,
            "shovePct": 12,
            "limpPct": 1,
            "rfiPct": 46,
            "completeCells": 169,
            "minimumCellOpportunities": 433
          },
          "SB": {
            "n": "6wIAALoBAACmAQAAsAEAAKIBAACmAQAAngEAAJABAACbAQAAhwEAAJEBAABYAQAAlAEAABcFAABhAgAAigEAAJYBAAChAQAAeAEAAI0BAABwAQAAdgEAAHYBAACHAQAAegEAAIEBAAAmBQAAEwUAADQCAAB0AQAAgQEAAIYBAACNAQAAcQEAAGQBAABOAQAAcwEAAEcBAABqAQAARwUAALgEAABSBAAAXAIAAGQBAAB+AQAAcQEAAHABAABoAQAAhAEAAHwBAABRAQAAaQEAAPMEAACgBAAAmQQAAFsEAAA/AgAAZwEAAFcBAACCAQAAYQEAAF8BAABiAQAAVAEAAGMBAACzBAAAbwQAAEUEAACIBAAAVAQAACwCAABGAQAAXwEAAFcBAABhAQAAPgEAAEwBAAA+AQAAxQQAAHYEAABdBAAAWgQAADUEAAARBAAACQIAAE4BAABPAQAATAEAAGkBAAAyAQAAaAEAAKsEAAB1BAAASwQAABYEAAA5BAAACAQAAAEEAAD+AQAAWgEAAFsBAABbAQAAYQEAADEBAACeBAAAjAQAADwEAAA/BAAAFgQAANcDAADeAwAAKwQAABoCAABfAQAAQwEAAFcBAAAsAQAAtQQAACgEAAAXBAAA+QMAABoEAADuAwAA7QMAAN8DAADkAwAAEwIAADcBAABJAQAAVAEAAGYEAAA1BAAACgQAAFIEAADbAwAA4gMAAPQDAADZAwAA/AMAAOsDAADoAQAAQgEAACcBAADBBAAANgQAACcEAAAOBAAANQQAANMDAADiAwAAwwMAAL0DAADPAwAAwQMAAOcBAAA7AQAAswQAAGMEAAARBAAAMAQAAM4DAADLAwAA+AMAAMMDAADFAwAA2AMAAOoDAACfAwAAswEAAA==",
            "r": "TgImAggCuAE2AcgAyACMAIIAeABkAG4AWgDCAZ4CQAEEAeYAoACWAKAAjACMAJYAtADIAK4B+gCAAqoAoAC0AIwAoAC0AKAAqgCqAL4ASgHSAIwAngKgAHgAjACgAIwAtAC+APoA3ADSAKoAqgCWAP4BeACMAIIA0gDIAMgAyADcAJYAyADcAMgAvgCkAYwAbgCMAMgAtACqAPAAbgDIANIA5gC+AKoA3ACCAIwAoADIAL4A5gBkANwA+gAEAcgAyAC0AKoAjACWAL4A0gDcAG4A+gDwAAQB5gC+ANIAtABGAKAAoACqALQAZAD6ACIBBAHIAL4AyAC+AKoAMgCMAKoAtABuAPoA+gAOAdwAyADcANwA0gC+ACgAvgCqAG4ADgEOAQQB3ADcAL4AtADIAL4AyAAyAOYAeAAYATYB3ADIAL4AyACWAL4AtADIAKoAMgA=",
            "j": "FADwAEoBpAEcAoACqALaAtoC+AL4AsYC+AKGARQAzAEwAkQCYgIcAhwC1gH+AdYBpAGaAaQBbAJkAGICWAL0Aa4BcgEsAQ4BGAHmALQACAJsAmICeABiAtYBkAEsAdIAvgCWAIIAeACUAmwC6gGuASwBOgKGAfoAvgCCADIAZABGAOQCzAFAAdIA0gCkAa4BVAHIAG4AMgBGAFAADAN8AeYAoAB4AIIAWAJyAcgAqgBQAEYAFAACA2gBjABkAFAAWgBuAKgCQAGWAFoAMgAyAO4CNgFkADIAKAA8ACgAWgA+AxgBbgBGACgA7gIEAVoAMgAeAB4AHgAoADwAZgPIAFAAPADaAvAAWgAyABQAFAAUABQAFAAyAFIDUAAyAMYCyABQACgACgAKAAoACgAUABQAFABmAygAqAK+AEYAHgAUABQACgAKAAoACgAKAAoAPgM=",
            "l": "fAHIAIwAggCWAJYAbgB4AIwAbgCMAKoAjACgADYB0gC0ALQA3AAsARgBcgFUAV4BhgFoAYwAggAEAdIA8AAsAaQBzAHqARIC4AESAkQCjACgAPAA0gDcAJABwgEIAk4CMAJYAhwCMAJ4AMgAQAGQAb4ALAG4AU4CEgImAjACEgIIAmQAQAGkARICHAKgAJoBEgJEAlgCOgIcApoBZABoAeAB/gE6AmICqgDqAWwCTgJYAhIC4AF4AFQBwgHCAfQB/gE6ApYACAJ2AoACMALWAXgAXgGkAV4BSgGQAf4BMAJaAAgCdgJ2AvQBggBeAVQBIgEOAQQBSgGaAToCUABsAlgCOgKMAF4BSgHwALQAqgDIABgBXgG4AWQAdgIcApYAXgEsAcgAoACCAIIAggDwAPAAGAFGANYBoABAAQQB8ACCAG4AeABkAIwAlgCMAJYAbgA=",
            "opportunities": 119656,
            "raisePct": 22,
            "shovePct": 27,
            "limpPct": 31,
            "rfiPct": 49,
            "completeCells": 169,
            "minimumCellOpportunities": 295
          }
        },
        "<15": {
          "EP": {
            "n": "2goAAHkHAACOBwAASwcAAHQHAADWBgAANgcAADEHAAAyBwAARAcAAAcHAAAvBwAANAcAALsVAAD6CgAAQgcAAGUHAAAdBwAAPQcAAGAHAAD0BgAA7QYAAP4GAAALBwAAEgcAACEHAACaFgAA3BUAAMUKAACdBwAAbwcAAAYHAAD+BgAADwcAAAoHAAAnBwAA+AYAADgHAABXBwAAVRUAAKsVAAAHFQAA6woAAPsGAAAGBwAA9wYAAKoGAAACBwAANgcAAL0GAAAZBwAAKwcAACkWAAA1FQAA5RQAAAAVAADNCgAA7AYAAFkHAAA6BwAAHAcAADYHAAD4BgAAzgYAALsGAADgFAAA7hQAAN4UAACuFAAAGhUAAPUKAAAdBwAACQcAANQGAAD6BgAAAwcAANsGAAA/BwAAPxUAAIQVAADSFAAA0BQAAO8UAADlFAAA5QoAAAoHAAANBwAA8wYAABcHAAAiBwAAHQcAAEYVAACwFQAA7hQAAGEVAAARFQAApxUAAK4UAABKCwAAFgcAAJsGAAAqBwAA9wYAABkHAACSFAAAOxUAAP8UAAA/FAAANRUAAAsVAACAFAAAPxUAAOQKAABlBwAA5QYAABsHAAC4BgAArBUAAHMVAADoFAAAfRQAANUUAABpFAAARhUAAHoVAAC+FAAAugoAAN4GAADvBgAAGgcAAFYVAADXFAAAhxUAADkVAAD6FAAA2xQAAC0VAACTFAAA3RQAAAsVAADQCgAA+QYAAOEGAADgFAAAVhUAANQUAAAFFQAAixQAAGIVAACIFAAA3BQAAL0UAABZFQAAQRUAAKoKAAAKBwAACRUAAI8UAAA+FAAAMRUAAMQUAAC0FAAA9RQAAH8VAADvFAAAPRUAADUVAADvFAAA7woAAA==",
            "r": "HAKqAKoAoADSAMgA0gC0AIwAqgCMAHgAWgCCAMwB3AD6APAAeAAoABQACgAKAAoAAAAAAG4A+gBKAQQByABGAB4AAAAAAAAAAAAAAAAAoACWADIA3AC+ADwAFAAKAAAAAAAAAAAAAADIAB4AFAAKAHgAUAAKAAAAAAAAAAAAAAAAACgAAAAAAAAAAABkACgAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAWgAeAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAFoACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABQAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "j": "aAEqAyoDKgPkApQCHALMAXIBmgFKASIB+gBIA+AB2gKKAv4BDgGMAFoARgAyACgAKAAeAFwDRAJ2AiYCpAGqAFoAKAAeABQACgAUAAoAFgNeAaAA+AKaAaAARgAoAAoACgAUAAoACgBiAowAWgBGAFIDyAAyAB4AFAAKAAoAAAAAACwBHgAUABQAFABmA3gAKAAKAAoAAAAAAAAA0gAUAAoACgAKAAoAUgNaAB4ACgAKAAAAAACCABQACgAKAAAACgAKADQDPAAKAAoAAAAAAFoACgAAAAAAAAAAAAAAAADGAigACgAKAAAAWgAKAAAAAAAAAAAAAAAAAAoAJgIUAAoACgBGAAoAAAAAAAAAAAAAAAAAAAAAAHIBCgAKADwACgAAAAAAAAAAAAAAAAAAAAAAAAAOAQAAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgA=",
            "l": "WgAKAAoACgAUABQAHgAeABQAHgAUABQAFAAKADIAFAAoACgAFAAKAAoACgAKAAAACgAKAAoAFAAeADIAKAAKAAoACgAKAAoACgAKAAoACgAUAAoACgA8ABQACgAAAAAAAAAAAAAAAAAKAAoAAAAKAAoAHgAKAAoAAAAAAAAACgAAAAoACgAKAAAAAAAKABQACgAKAAAACgAAAAoAAAAKAAoAAAAAAAoAFAAUAAoACgAAAAAAAAAKAAAAAAAAAAoAAAAAABQAFAAKAAAAAAAAAAAACgAAAAAAAAAAAAoACgAUAAoACgAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 598438,
            "raisePct": 3,
            "shovePct": 13,
            "limpPct": 1,
            "rfiPct": 16,
            "completeCells": 169,
            "minimumCellOpportunities": 1691
          },
          "MP": {
            "n": "EQkAAP0FAAD0BQAAHAYAAPcFAAAMBgAA+QUAABsGAACiBQAAJgYAAJIFAADpBQAA0QUAAPgRAAC/CAAAyAUAAKMFAADABQAAlQUAAO4FAACbBQAApwUAAIwFAACSBQAAzgUAAL8FAAADEgAAOxEAAK8IAADPBQAAtgUAAK8FAACPBQAAiwUAAIEFAAByBQAA8AUAAIgFAACqBQAAqREAABURAABsEQAA9ggAAOAFAACLBQAArQUAAH0FAACHBQAAqQUAALYFAACpBQAAuQUAAIoRAACDEQAAshAAAPkQAADoCAAA1AUAAHQFAADFBQAAwwUAAH0FAAB+BQAAsgUAAJgFAAAcEQAATxEAAB4QAADAEAAAhRAAAI8IAAClBQAA2wUAALQFAABfBQAAbgUAAKYFAABnBQAAQhEAAMgQAADzEAAAuhAAAFkQAACjEAAA3QgAANYFAABTBQAASwUAAHQFAABPBQAA0wUAACIRAADGEAAAhRAAALUQAAC/EAAAdBAAAJcQAACECAAArQUAAMwFAACKBQAAsgUAAGIFAADSEAAAgRAAAN4QAADsEAAAChEAAKIQAAAcEAAAhBAAAFgIAAClBQAAVQUAAFkFAACTBQAAVhEAALsQAACZEAAAsBAAAJ4QAACiEAAArBAAAKcQAABnEAAAhAgAAGAFAACMBQAAaQUAAMEQAAANEQAAkBAAAJMQAACtEAAARxAAACwQAACNEAAAGBAAALAQAACPCAAAPQUAAKcFAAAxEQAA6RAAAMQQAACUEAAAgBAAAHcQAAABEAAATBAAAEQQAABPEAAAfRAAAH0IAACYBQAA/BAAAKIQAACLEAAADREAAIUQAAB5EAAAbBAAAAsQAACHEAAAGRAAAIEQAAA/EAAAhwgAAA==",
            "r": "HAKqAJYAjACgAL4AvgC+AKoAtACgAIwAeAB4AMIBvgDIANIAggBGACgAFAAKAAoACgAKAHgA5gByAdwA0gB4ADIACgAAAAAAAAAAAAAAjADIAFoA3ADSAFAAHgAAAAAAAAAAAAAAAAC0ADwAHgAUAIIAZAAUAAAAAAAAAAAAAAAAADwACgAAAAAAAABaADIACgAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAZAAoAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAGQAFAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABaABQAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "j": "XgEqAz4DPgMWA9ACigIwAuAB9AGkAXwBSgFcA/QBAgPQAk4CaAG+AG4AZABGADwAKAAeAFIDlAJOAnYC/gHmAHgAMgAeAB4AFAAUABQAPgO4AeYA+ALgAb4AbgAoABQACgAKAAoACgDGAsgAeABQAFIDBAFGAB4ACgAKAAoACgAKAK4BMgAUABQAFABwA5YAKAAKAAoACgAAAAoAGAEUAAoACgAKAAoAXANuAB4ACgAAAAAACgC+AAoACgAAAAAAAAAKAEgDWgAUAAoAAAAKAIwACgAAAAAAAAAAAAAACgAWAzwACgAKAAAAeAAKAAAAAAAAAAAAAAAAAAAAqAIUAAoAAABaAAoAAAAAAAAAAAAAAAAAAAAAAAgCCgAAAEYACgAAAAAAAAAAAAAAAAAAAAAAAAByAQoAPAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAIgE=",
            "l": "ZAAKAAoACgAUABQAFAAUAAoAHgAUAAoAFAAKACgACgAeACgAHgAUAAoAAAAKAAoACgAKAAoAFAAeACgAKAAUAAoACgAKAAAACgAAAAAACgAUAAoACgAyAB4ACgAKAAAACgAKAAAAAAAKAAoACgAKAAoAMgAKAAoAAAAAAAAAAAAAAAoAAAAKAAAAAAAKAB4ACgAKAAAAAAAAAAAAAAAAAAoAAAAAAAAAFAAUAAoAAAAKAAoAAAAAAAoAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAoAAAAKAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAFAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 475715,
            "raisePct": 4,
            "shovePct": 14,
            "limpPct": 1,
            "rfiPct": 18,
            "completeCells": 169,
            "minimumCellOpportunities": 1341
          },
          "HJ": {
            "n": "gwcAAAUFAADOBAAAygQAAM0EAACqBAAA8QQAAJ4EAACOBAAAnAQAALQEAACyBAAAlQQAAGkOAADjBgAApAQAAIYEAAC7BAAAfAQAAHMEAABtBAAAKwQAAKEEAABqBAAARwQAAF0EAACKDgAA6g0AABkHAAChBAAAnQQAAFoEAAA8BAAAPwQAAE8EAABdBAAARwQAAGgEAAA8BAAAAg4AAMsNAACODQAABwcAALMEAAB1BAAAQgQAAGIEAABRBAAANQQAAPEDAABWBAAAIwQAAMoNAABfDQAAVA0AAGQNAADKBgAAqAQAAGYEAABcBAAAfgQAAFsEAAAEBAAAXgQAAGkEAADJDQAA8AwAAPIMAACpDQAAMw0AAGwGAABRBAAAOAQAAFAEAAA5BAAAOAQAAEQEAABgBAAAlA0AAN8MAAAuDQAAMw0AAB4NAAAXDQAAkAYAAAQEAAD0AwAAXgQAAC8EAABXBAAAFwQAAM4NAABuDQAADg0AACkNAAD+DAAAswwAAOQMAACaBgAATgQAAC0EAABKBAAAXQQAADUEAAC2DQAAcwwAAB8NAACdDAAA5QwAAKIMAADwDAAAnAwAANwGAABHBAAAVAQAABYEAAARBAAAVQ0AALoMAABmDQAA1QwAAIUNAADJDAAAzwwAALwMAAB0DAAAkwYAADAEAAArBAAAZQQAAHENAAC/DAAA1wwAADINAAD4DAAAwQwAAN0MAAAnDQAAtQwAAFwMAAB8BgAATwQAABIEAACnDQAAVwwAAP8MAADjDAAAkwwAAM8MAADHDAAAsQwAANkMAACaDAAAsgwAAI0GAAA0BAAAlQ0AAJ4MAADVDAAA2AwAALoMAABwDAAA8AwAAMQMAACbDAAA1gwAAGEMAABwDAAAegYAAA==",
            "r": "JgK0AJYAoACMAJYAoAC0AKoAtAC0AKAAlgCMANYBqgCqAMgAtABuAFAAKAAeAB4ACgAKAG4AtABoAb4AyACCAEYAHgAKAAoACgAAAAAAeADIAIwA3ADSAHgAUAAKAAoAAAAAAAAAAACCAG4ARgAyAJYAjAAoAAoAAAAAAAAAAAAAAGQACgAKAAAACgBkAFoAFAAKAAAAAAAAAAAARgAKAAAACgAAAAAAUAA8AAoAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAFAAKAAKAAAAAAAAABQAAAAAAAAAAAAAAAAAAABGABQAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAPAAKAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "j": "aAEgA0gDNAM+AxYD+ALQAoACigIwAhwC1gFIA+ABFgMMA7IC/gFKAdIAjABuAHgAUABGAGYD+AJiAtoCYgJeAcgARgAyACgAFAAUAB4AUgNOAmgB+AJOAiwBqgBQABQAFAAKAAoAFAAqA14BvgCMAD4DXgGMADIAFAAKAAoAAAAKAIACWgAeAB4AFABwA8gAMgAUAAoAAAAAAAAA9AEoABQACgAKAAoAegOWAB4AFAAAAAAACgByAR4ACgAKAAAAAAAKAHADbgAUAAoACgAAAPAAFAAAAAAAAAAAAAAACgBcA0YACgAAAAAA3AAKAAAAAAAAAAAAAAAAAAAAFgMoAAoAAACqAAoACgAAAAAAAAAAAAAAAAAAAMYCCgAAAJYACgAAAAAAAAAAAAAAAAAAAAAAAABEAgoAeAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAzAE=",
            "l": "UAAKAAAACgAKAAoACgAKABQAFAAUAAoAFAAKACgACgAUABQAFAAUAAoACgAKAAoACgAAAAoACgAUABQAKAAUABQACgAKAAAAAAAKAAoACgAUABQACgAoAB4ACgAKAAAAAAAKAAAAAAAKAAoACgAKAAoAKAAKAAoAAAAAAAAAAAAAAAoACgAKAAAAAAAKAB4AAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAoACgAeAAoACgAKAAAAAAAKAAoAAAAAAAAAAAAAAAoACgAAAAoAAAAKAAoAAAAAAAAAAAAAAAAAAAAKAAoACgAKAAAACgAAAAAAAAAAAAAAAAAAAAoACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 370596,
            "raisePct": 4,
            "shovePct": 18,
            "limpPct": 1,
            "rfiPct": 22,
            "completeCells": 169,
            "minimumCellOpportunities": 1009
          },
          "CO": {
            "n": "pAUAAN8DAADNAwAA8QMAAOsDAACRAwAAnQMAAJkDAACWAwAAwwMAAKoDAACGAwAAtAMAAA0LAABABQAAdAMAAK4DAAClAwAAhwMAAGgDAACCAwAAPgMAAGgDAABMAwAAOwMAAD8DAAAvCwAA1AoAAGgFAACfAwAAcQMAALIDAAA6AwAAZAMAAHYDAABOAwAATAMAAA4DAABBAwAAfAsAAGMKAADMCgAAeQUAAJEDAABlAwAAiwMAAIIDAABjAwAAVAMAAEkDAAA+AwAAMgMAAFwLAABvCgAAhQoAAOIJAAAvBQAAaQMAAEgDAAApAwAATwMAAEkDAAA/AwAAfAMAAFEDAAAWCwAA/AkAAH0KAABYCgAALQoAAB8FAABAAwAAPAMAAEUDAABMAwAADAMAACwDAABqAwAAgwoAACMKAAAoCgAABAoAAOIJAAAVCgAAZQUAAGUDAAAdAwAAOQMAAFQDAAA+AwAAQAMAAK4KAADwCQAA8wkAAPgJAADYCQAAsgkAAN8JAADyBAAARAMAAC4DAAA1AwAADgMAACUDAACNCgAALwoAAOUJAADJCQAA3QkAAHcJAAA6CQAA+QkAAE4FAAAmAwAAGQMAACsDAAAhAwAAHAsAANcJAACiCQAAyQkAANIJAACRCQAAlAkAAK8JAACeCQAA9gQAADoDAAAlAwAAHgMAADAKAABNCgAAxQkAAPoJAADACQAATQkAAHMJAABbCQAAZwkAAFsJAAARBQAASgMAAE4DAABPCgAABAoAABoKAAB/CQAADwoAAKIJAAAvCQAAnwkAAJgJAACMCQAAWAkAAL0EAAAiAwAATgoAAAYKAACNCQAApgkAAJ0JAACOCQAAQgkAAIIJAABBCQAAgQkAAA8JAABACQAAAwUAAA==",
            "r": "TgLwAKoAggB4AHgAeACCAIwAjACWAIwAeACWAP4BlgCWAIIAtACqAIwAeABaAEYAMgAyAIwAjAB8AZYAtACqAKAAWgA8ACgAHgAUAB4AbgCgALQAGAGgALQAjABGAB4AFAAKAAoACgBuAKoAlgBuALQAlgBaACgAFAAAAAoACgAKAG4ARgAoAB4AFACMAGQAPAAUAAoAAAAKAAAAZAAoABQAFAAKABQAWgBuACgACgAAAAoAAABkABQACgAKAAoAAAAKAFAARgAoAAoAAAAAAFAAFAAKAAAAAAAAAAAACgBGADwACgAAAAAARgAKAAAAAAAAAAAAAAAAAAAAUAAeAAoACgA8AAoAAAAAAAAAAAAAAAAAAAAAADIACgAAADIACgAAAAAAAAAAAAAAAAAAAAAAAAA8AAoAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "j": "SgHuAjQDUgNSA1IDSAM0AxYDDAMCA+4C2gI+A7gBKgMgAyoDlAL0AZoBIgHwAL4AjACMAEgDKgNOAgwD2gISAnIBoABkAFAAPAAyACgAXAPuAjoCvALQAswBLAF4ADIAHgAeABQACgBSAxwCaAEOASADCALcAFoAHgAKAAoACgAKACoD3ABQADIAMgBIA2gBbgAoAAoACgAKAAAA+AJkACgAFAAKAB4AcAPwAEYAHgAUAAAACgCeAjIACgAKAAAACgAUAHoDtAAeAAoACgAAABICKAAKAAoAAAAKAAoACgB6A24AFAAKAAAACAIeAAoAAAAAAAoAAAAKAAoAUgMyAAoAAACkARQACgAAAAAAAAAAAAAAAAAKAEgDCgAAAHIBFAAKAAAAAAAAAAAAAAAAAAAAAAAMAwAALAEUAAoAAAAAAAAAAAAAAAAAAAAAAAAAqAI=",
            "l": "RgAKAAAACgAKAAoAAAAKAAoACgAKABQACgAKACgACgAUAAoAFAAUABQACgAKAAoACgAAAAoACgAUABQAFAAeABQACgAAAAAACgAKAAoACgAKABQACgAeAB4AHgAKAAAAAAAAAAAACgAAAAoAFAAKAAoAPAAKAAoAAAAAAAAAAAAAAAAACgAKAAoACgAKACgACgAKAAAACgAAAAAAAAAKAAAAAAAAAAAACgAoAAoAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAoAHgAAAAAACgAAAAoAAAAAAAAAAAAAAAAAAAAKABQAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 283341,
            "raisePct": 5,
            "shovePct": 23,
            "limpPct": 1,
            "rfiPct": 28,
            "completeCells": 169,
            "minimumCellOpportunities": 780
          },
          "BTN": {
            "n": "3wQAACsDAADhAgAAGQMAAKYCAAAHAwAA7gIAAL8CAADfAgAArwIAANcCAADKAgAA2wIAAK4IAABdBAAAxQIAAM4CAADmAgAAnwIAAIwCAAC/AgAAzQIAALwCAACGAgAAigIAAHICAADICAAAHggAANQDAAClAgAAqAIAAK0CAABoAgAAhwIAAIwCAACfAgAAcgIAAJ4CAABrAgAA3QgAAF8IAADrBwAAJgQAANECAACzAgAAiQIAALMCAABnAgAAhQIAAGsCAAB8AgAAZAIAAOgIAAA3CAAATggAAOgHAAA9BAAAkQIAAHUCAABiAgAAcQIAAIICAABUAgAAegIAAHECAAC8CAAAKwgAAKoHAADKBwAA7QcAAO4DAACtAgAAaAIAAD4CAACFAgAAQwIAAFECAAB2AgAARggAAO4HAACrBwAA1AcAANoHAABvBwAAuwMAAGMCAABwAgAAYAIAAE8CAAB/AgAAeAIAAN4IAADCBwAAagcAAJgHAADMBwAAWwcAAG4HAACsAwAAfgIAAHQCAABFAgAAWAIAAG8CAACGCAAAlAcAAMcHAAC1BwAAhQcAAPsGAAAcBwAAKwcAAMsDAABZAgAAfwIAAHACAABZAgAAbwgAAM8HAACoBwAAsgcAAHsHAAAtBwAAdQcAAEsHAABEBwAAkwMAAGsCAAAtAgAAPgIAAD0IAACuBwAAfwcAAFYHAABSBwAAUwcAACYHAAB5BwAAGgcAABMHAACAAwAATwIAAEgCAAAQCAAAkwcAAGoHAACJBwAAZAcAABIHAABfBwAA/QYAAP4GAAAWBwAA9QYAAIwDAABUAgAAQAgAAHQHAABNBwAAlAcAAGgHAAAiBwAANQcAAEkHAAACBwAADwcAAPMGAABJBwAA1AMAAA==",
            "r": "dgIOAfoA3ACgAHgAjACCAHgAZAB4AHgAggDmADACqgCgAIwAoACWAL4AtACgALQAqgC0AMgAggDMAYwAggCWAMgAvgCMAHgAeACCAIwAoACMAKoAVAGgALQAyAC+AGQAbgBuAG4AWgB4AKoAvgCqAPoAqgC+AJYAUABQAEYAPAA8AGQAoACWAHgAbgC+AKoAlgBuAFAAPABGACgAZACCAG4AZABQAFAAeACgAG4AZAA8ADIAKABkAG4ARgA8ADIAMgBGAFoAoAB4ADwAPAA8AG4AWgA8ACgAKAAeAB4APABGAJYAZABGADIAbgBQADIAHgAUABQAHgAeADIARgB4ADIAMgBkAEYAKAAeAAoAFAAUABQAFAAeAEYAUAAyAGQAPAAoAB4AFAAUAAoACgAUAAoAFAA8ADwAZAA8ACgAFAAKAAoACgAKAAoACgAUAAoAUAA=",
            "j": "IgHGAuQCAgMqA2YDSANSA1IDXANIA0gDSAPuAnwBKgM0AzQD+AL4AoACTgIcAv4BmgGGARYDSAP+ASoDPgPkAmICmgFAAQ4B3AC+ALQANAM0A9oCigIMA54C9AE2AaoAbgBkAFoAWgBSA+4CYgISAuQCqAKkAdIAbgA8AEYAMgAoAGYD/gEiAcgAoAAWAwgC8ABkADwAMgAoAB4AXANoAb4AeABGAFAAXAPCAdwARgAyACgAHgBIAxgBZAA8ACgAKAAyAIQDSgFQADIAKAAUACoDyAA8AB4AFAAUAB4AKACEAwQBRgAyACgAFgOWADIAFAAUAAoAFAAUACgAhAOCACgAFAD4AngAKAAUABQACgAKAAoACgAeAHoDPAAoAO4CeAAeAAoACgAKAAoACgAKABQACgBmAx4AxgJkACgAFAAKAAoAAAAAAAoACgAAAAoANAM=",
            "l": "RgAKAAAAAAAKAAAACgAAAAoACgAKAAoAAAAKADIACgAKAAoACgAKABQAHgAUABQAFAAKAAAACgAUABQACgAeAB4AFAAKAB4ACgAKABQACgAKAAoAAAAUAB4AHgAUAAoACgAKAAoAAAAKAAoAFAAUAAAAKAAoAB4ACgAKAAAACgAAAAAACgAKAAoACgAKADIAFAAUAAoACgAAAAAAAAAKAAoACgAAAAoAAAAyAB4ACgAKAAAACgAAAAAAAAAAAAAAAAAKAAAAHgAeAAoACgAKAAoAAAAAAAAAAAAKAAoAAAAAACgACgAKAAoAAAAKAAAAAAAAAAoAAAAAAAAAAAAeAAoACgAAAAAACgAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 216720,
            "raisePct": 9,
            "shovePct": 31,
            "limpPct": 1,
            "rfiPct": 40,
            "completeCells": 169,
            "minimumCellOpportunities": 557
          },
          "SB": {
            "n": "jAQAALkCAADOAgAAnQIAAIcCAAChAgAAuAIAAFoCAAB8AgAAeQIAAEMCAABeAgAAbgIAAFEIAAAHBAAAkQIAAHwCAACNAgAAWQIAAHoCAAA8AgAATgIAACECAAB3AgAAPwIAAB4CAADqBwAAiQcAAK8DAACBAgAAYQIAAE8CAABnAgAAQgIAAFICAAAsAgAAUgIAACACAABQAgAA7AcAABQHAAAlBwAAugMAAGQCAABgAgAATQIAADICAAA1AgAANQIAAC4CAAAcAgAAJAIAADsIAABaBwAALQcAANEGAACpAwAAUwIAAFICAAAOAgAANAIAACkCAAAwAgAAHwIAAAUCAACzBwAAXAcAAN8GAADGBgAA8wYAAGgDAABIAgAAMAIAACYCAAAgAgAAIAIAAAACAAABAgAAoAcAAO0GAADABgAAkwYAALYGAACQBgAAKgMAADsCAADaAQAACQIAADYCAAAKAgAA9gEAAE4HAADMBgAAmQYAAIUGAACkBgAARQYAAGUGAAABAwAAHwIAAPABAAAVAgAA3wEAAPoBAACBBwAAzgYAAJ8GAACnBgAAuwYAADMGAAATBgAAPAYAAPECAAD6AQAAAAIAACECAADuAQAAQgcAANEGAACsBgAARwYAACMGAAAsBgAAUAYAAE4GAAAYBgAAMAMAABACAAAUAgAA8QEAABQHAAANBwAAnAYAAI4GAACZBgAAhgYAACAGAAD0BQAArAUAAOkFAAADAwAA7wEAAPkBAABlBwAA0gYAAFsGAAD4BQAAZAYAAPEFAABeBgAAEwYAAOYFAAABBgAAEQYAANwCAADAAQAARQcAANIGAACjBgAAbgYAAJsGAABYBgAA4gUAABQGAAAEBgAAygUAAPAFAADsBQAA8QIAAA==",
            "r": "SgHIAL4AjABaAEYARgAyACgAMgAeACgAMgC0AIYBeABaADwARgAyACgAMgAyADIAKAAyAJYAUABAATwAMgAyADwAHgAyADIAPAAyADIAbgAyADwAIgEoAEYAPAAyAEYARgBQAFAAUABGACgAMgAyANIAKAA8AEYAMgBGADwARgBaADIAMgBGADwAPACCADIAKAAyAEYAZABGAEYAPAA8ADwARgBGADwAUAAoADIAKABQAFoAUAAoADwAUABQAFAARgBGADwAMgAyADIAMgBQAB4APABQAFoAWgBQAFAAPAAyADIARgA8AEYAKABGAFAAbgBaAFoAZABQADwAMgAoADwAPAAeAEYAWgBQAFoAZABkAGQAWgBaACgAPABkACgAPABaAGQAZABaAFoAZABaAGQAWgAoAEYAKAA8AGQAZABaAFoAbgBaAG4AZABkAGQAHgA=",
            "j": "vgCyAtACIANIA3oDhAOEA6IDhAOYA44DjgP4AvoAPgNcA3oDcAN6A3oDSANSA1IDNAMgAwwDcANyAXoDhANmA1IDSAPkAuQCsgKoApQCSAOOA2YD9AF6AzQDAgPQAmICJgLqARwC9AF6A44DUgM0A54CSAPGAnYCEgKaAZABSgE2AZgDZgPuAooCRAIWAwwDgAL0AYYBNgEiAQ4BmAM0A54CHAKkAcwBZgPkAjACuAEiAQQB5gCiAyoDMAK4AUoBNgF8AYQDngLWAV4BBAH6AKIDAgPqATYB8AD6AAQBQAGiA0QChgEsAfoAmAPQArgB+gC0AL4AtADcABgBogPMAUoB5gCYA7wCpAHmAJYAeACCAJYAoACqAKwDQAH6AJgDngKGAdwAjABkAG4AbgB4AIIAggCiA9IAjgNiAmgBvgCCAGQAWgBQAFoAZABaAFoAmAM=",
            "l": "1gFuAFoAPAA8AB4AFAAeABQAHgAeAB4AHgA8AGgBKAAoACgAKAAoADIAUABGAEYAbgB4ADwAHgAsASgAKAA8AEYAZACWAJYAqgC+AL4AKAAUADIAyAAyAFoAggCqAOYA+gAYAdwABAEeAB4ARgBkAG4AZADIAOYALAE2ASwBLAEiARQAMgCCAL4A8ABQAIwA+gAsASIBLAEiAfoACgBGAKAA3AAYASIBHgCqACwBXgFKASwB+gAUAEYAoADmABgBIgEiARQA0gAiAXIBLAHcABQAUACqAL4A0gD6ABgBLAEKABgBXgE2ARgBFABaALQAqgCMAJYAtAAEASIBCgBAAUABSgEUAFoAlgCWAHgAZACCAKoA0gAOAQoAaAEiARQAZACgAIwAZABuAFoAbgCMAJYAvgAKACwBFABkAIwAggBkAFAAUABQAFAAZABuAGQAFAA=",
            "opportunities": 188616,
            "raisePct": 8,
            "shovePct": 53,
            "limpPct": 14,
            "rfiPct": 61,
            "completeCells": 169,
            "minimumCellOpportunities": 448
          }
        }
      }
    },
    "l1": {
      "label": "Первая лига",
      "shortLabel": "Первая лига",
      "ranks": "R1–5",
      "description": "Активные реальные игроки текущей Лиги 1 с минимум 30 000 рук в окне FFEV.",
      "players": 165,
      "selectedPlayers": 165,
      "charts": {
        "70+": {
          "EP": {
            "n": "CBYAAPEOAAAYDwAAjg4AAE4OAABmDgAAUw4AAIcOAAAvDgAAgw4AAKkOAABeDgAARw4AADwsAAA0FgAAyQ4AAHsOAAD8DgAAsg4AAIAOAADqDQAAXw4AAPoNAADrDQAAJg4AAEcOAACJKwAALCsAADsWAAC5DgAAag4AAI0OAAAqDgAAmA4AAAoOAAArDgAAGA4AABsOAABYDgAA4SoAAPsqAADFKgAAyBYAAEEOAACODgAAfA4AAD4OAAAMDgAATQ4AADQOAACWDgAA/g0AABErAAA7KwAAHCsAAEYrAAAvFgAAnQ4AACAOAAAyDgAAKw4AADoOAABDDgAAXw4AABYOAACtKgAAXSsAAJ8qAABpKgAAICsAAPwVAABwDgAAeg4AAC8OAABKDgAA3Q0AAG4OAABVDgAAkyoAAKQqAABKKgAAyCoAANgqAADwKgAAyBUAACQOAAAsDgAAlw4AAE4OAAAcDgAAhw4AAI8qAAB2KgAAZSoAAKQqAADuKQAAkioAABcrAABKFgAALw4AAJAOAAAsDgAAGg4AAEEOAADSKgAApyoAAMQqAAB3KgAAcCoAAEYrAAD5KgAA8SoAAFkWAABSDgAARg4AAPsNAADcDQAAyCoAAMsqAABJKgAA+ioAAH0qAAATKgAA8SkAAOMqAACkKgAAqxUAABwOAAADDgAARw4AAFgqAACFKQAAfSoAAKsqAAAhKwAA6SoAAFIqAACYKgAAnCoAADgrAABmFQAAJA4AAN4NAADGKgAAPyoAALYqAACoKgAA0yoAAPQqAACmKgAALCsAAI0qAADwKgAA1ioAAFUVAAANDgAAYysAAOsqAAAIKwAA9ioAAAorAADLKQAA5SkAAHYqAAB6KwAAQSoAAJQqAAAVKgAAphUAAA==",
            "r": "1APUA94D6APoA+gD6APeA94D3gPeA9QDygPeA9QD6APoA94D1AMWAyYCQAHcAIIAUAA8AN4D6APeA+gD3gO2A2ICUAAUABQACgAKAAoA6AOsA4oC3gPoA7YDbAJQAAoAAAAAAAAAAADUA8wBLAHmAOgD1AOeAlAACgAAAAAAAAAAABgBCgAAAAAACgDeA8ADDgEUAAAAAAAAAAAAPAAAAAAAAAAAAAAA3gOYA74ACgAAAAAAAAAUAAAAAAAAAAAAAAAAAOgDSANQAAoAAAAAAAoAAAAAAAAAAAAAAAAAAADeA+4CKAAAAAAACgAAAAAAAAAAAAAAAAAAAAAA1APCAQoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAKwDKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5AI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "FAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 1212246,
            "raisePct": 23,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 22,
            "completeCells": 169,
            "minimumCellOpportunities": 3548
          },
          "MP": {
            "n": "+hAAACoLAACnCwAA9goAALMKAABmCwAAYgsAAPgKAABTCwAAjwsAADILAAD6CgAASAsAAOghAACDEQAARgsAABULAAAsCwAA6QoAAAELAACUCgAA8goAAH8KAADPCgAAkAoAANEKAAAnIQAAJyEAAGoRAAAQCwAALgsAADALAAA9CwAAFQsAAIEKAAD8CgAAnwoAAMkKAACiCgAANiIAAFAhAAAtIQAA8BAAANoKAADrCgAA5QoAAO4KAACRCgAAwAoAACALAACqCgAA4AoAACgiAADKIAAAByEAAPIgAADvEAAAmAoAAAQLAABnCgAA/AoAALEKAABbCgAAUQoAAHkKAACBIAAAWCAAAB4gAABKIAAASSAAAPwQAABpCwAAdgoAAIwKAACRCgAAhwoAAMkKAACNCgAAWyAAAIsgAAClIAAA1iAAAFYgAADwHwAAuRAAALcKAAAuCgAAdgoAACwKAADlCgAAswoAAOwgAACiIAAAyh8AAKcgAAC5IAAAtR8AAPIfAABoEAAA0woAAKkKAAANCgAAbwoAAMoKAACvIAAAoB8AALsfAADzIAAA2B8AAPkfAAAmIAAArx8AAG8QAABgCgAACAsAALgKAADrCgAATCAAAIMgAABZIAAAXSAAAAQgAAA+HwAAESAAAAcgAACMIAAAlBAAAH8KAABMCgAAjwoAAFUhAABuIAAAYCAAAEcgAACDHwAAmiAAABogAAB8IAAAyR8AAB4gAAAlEAAAngoAAJIKAABCIAAA/B8AAIsgAAAdIAAAmCAAAEkgAAAEIAAAJCAAAEcgAADCHwAAvR8AAOcPAADECgAAViAAAF8gAAD7IAAAfCAAAP0fAAD+HwAAqCAAAHIgAADXHwAAJyAAALEfAABpHwAAJRAAAA==",
            "r": "1APeA94D6APoA+gD6APeA94D3gPeA94D3gPeA9QD6APoA+gD3gOOAwIDOgK4ASwB0gCCAN4D6APeA94D6APUAyoD3ABQADIAKAAUAAoA6APUA2YD3gPeA94DKgPSABQACgAKAAoAAADeA/gCWAIIAt4D3gNIA9IAKAAAAAAAAAAAAE4CHgAUAAoAFADoA94D4AEyAAoAAAAAAAAA0gAKAAAAAAAAAAoA3gPKA2gBHgAAAAAAAAA8AAAAAAAAAAAAAAAAAOgDrAOqABQAAAAAABQAAAAAAAAAAAAAAAAAAADeA1IDZAAKAAAAHgAAAAAAAAAAAAAAAAAAAAAA3gNiAhQAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAMoDPAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAACsAwAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXAM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "FAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 917907,
            "raisePct": 26,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 26,
            "completeCells": 169,
            "minimumCellOpportunities": 2573
          },
          "HJ": {
            "n": "Ug0AADgIAAB8CAAAbAgAALUIAAB1CAAA2gcAABoIAAAwCAAAJAgAABUIAAAKCAAA0gcAADgZAAA4DAAAQAgAAAMIAAAECAAA9AcAABUIAADxBwAAowcAANgHAADXBwAAfgcAAMsHAABwGQAATBgAAJkMAAAPCAAAOggAANIHAADRBwAAtQcAAOAHAABtBwAAAggAAL0HAACyBwAA7hgAAI4YAAAvGAAARAwAABsIAAC5BwAAxAcAAPYHAADJBwAApQcAAK0HAACwBwAAYgcAAK4YAADLFwAA0xcAAPsXAACHDAAA4gcAAAUIAADgBwAApwcAANoHAACCBwAAwwcAANcHAABsGAAAjhcAAJUXAABnFwAA3RcAABEMAADsBwAABwgAAMgHAACdBwAAVQcAAIQHAACNBwAAfRgAAF8XAAD4FgAApxcAAF8XAAAlFwAA7AsAAN0HAADkBwAAVgcAAI0HAACTBwAAYgcAAFkYAAClFwAAdBcAAFsXAACuFwAA7xYAALcWAACwCwAAiQcAAFkHAABoBwAAZAcAAGoHAAD2FwAADBcAAHcXAABwFwAAyRYAAJQXAAAtFwAAHhcAAC0LAACVBwAAzAcAAGoHAAA3BwAAlRgAAGoXAABGFwAAARcAAOgWAADlFgAA3xYAAH8WAABZFgAAhwsAAIAHAACSBwAAwAcAAKgXAAAnFwAA5BYAAJ4XAABsFwAAWhcAAGsWAAALFwAALBYAANcWAAB0CwAAzQcAAIAHAADGFwAAVBcAAPQWAAAIFwAA6xYAAFMXAAAlFwAANBYAALgWAADUFgAAYxYAAAoLAACTBwAA1RcAAIAXAABAFwAAWxcAAJQWAABEFgAAfRYAAG8WAAC/FgAA+BYAAAcXAACgFgAAcQsAAA==",
            "r": "3gPoA+gD6APoA+gD6APeA94D3gPeA94D3gPoA94D6APoA+gD6APKA6IDXAMgA54CHAKkAegD6APeA+gD6APeA6wDWAJUAfAAoAB4AFAA6APeA9QD3gPoA94DogNiAmQARgAeAB4AFADoA6wDcANSA+gD6AO2A0QCjAAUAAoACgAAAIQD3AB4AGQAjADoA94DIAPmAB4ACgAAAAAAlAIeABQAFAAKAB4A6APeA6gCeAAUAAAAAABAAQoAAAAAAAAAAAAKAN4D1APMAVAACgAAAHgACgAAAAAAAAAAAAAACgDoA7YDBAEUAAoAtAAAAAAAAAAAAAAAAAAAAAoA3gMWAzwACgBkAAAAAAAAAAAAAAAAAAAAAAAAAN4DqgAKAEYAAAAAAAAAAAAAAAAAAAAAAAAAAADKAwoAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 661680,
            "raisePct": 31,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 31,
            "completeCells": 169,
            "minimumCellOpportunities": 1847
          },
          "CO": {
            "n": "3ggAABgGAADNBQAAlwUAANIFAAC8BQAAYwUAAIcFAABeBQAAcAUAADMFAACNBQAARwUAABYRAABRCAAAngUAAKMFAACEBQAAsAUAAJ0FAABJBQAAeQUAAE4FAABxBQAAPgUAADcFAABbEQAAvRAAAHYIAABqBQAAEAUAAHYFAAA9BQAAGQUAAOAEAABHBQAAMgUAAAoFAADPBAAAPBEAAIMQAABBEAAALQgAAFQFAAAmBQAAKQUAAFAFAAAKBQAAbAUAAGQFAAD2BAAA9QQAADwRAAA5EAAARBAAAMwPAAAoCAAAbAUAAF4FAABsBQAAzwQAABQFAABGBQAANwUAADoFAACkEAAADxAAALQPAADHDwAAMRAAAO8HAAAQBQAAGAUAAAwFAADwBAAA9gQAANgEAADTBAAA5BAAACoQAACLDwAApw8AACUPAAAQDwAAkAcAACwFAADtBAAAMAUAAOEEAACdBAAA0QQAABgQAABPDwAAow8AAK0PAAAdDwAAeA8AAHkPAAC5BwAAOgUAAPsEAADBBAAAwgQAABkFAABqEAAAtw8AAJYPAABIDwAAjQ8AAP0OAAAMDwAA5A4AANwHAAD/BAAA6gQAAPsEAACdBAAAhxAAAJkPAABFDwAAeA8AAEIPAAA+DwAA8Q4AAN8OAAAODwAAtAcAAOcEAAApBQAA7AQAAEUQAACSDwAAGQ8AALsPAABYDwAA9Q4AABAPAACBDgAA2A4AAIUOAACIBwAAtQQAAM0EAAA2EAAAwg8AAE8PAACmDgAAvA8AADgPAAAlDwAA1Q4AABkPAACgDgAA/w4AAKQHAADJBAAAbRAAAHsPAACpDwAAJQ8AADcPAABqDwAAVA8AAPkOAAC3DgAAng4AANoOAAC/DgAAcAcAAA==",
            "r": "6APoA+gD6APoA+gD3gPeA+gD6APoA+gD6APoA+gD6APoA+gD3gPeA94D1APKA7YDmANSA+gD6APoA+gD6APoA94DrAN6AyoD5AKyAiYC6APoA94D6APoA+gD3gOYA4oCEgKQATYBGAHoA94D1APUA+gD3gPeA44DbALcAHgAWgA8AN4DPgPkArICsgLoA+gDygPGAiIBWgAyAB4AwAOaAUABNgHcAEoB6APeA7YDEgK0AB4AFAB6A6oAHgAoAB4AMgCqAOgD3gM0A5ABWgAUAPgCRgAKAAoACgAKAB4AUADeA94DlALSADIANAMoAAoAAAAAAAAAAAAKACgA6AOiA0oBRgDkAhQACgAAAAAAAAAAAAAACgAUAN4D6gFaAGwCFAAKAAAAAAAAAAAAAAAAAAAAAADeA1AAHAIUAAAAAAAAAAAAAAAAAAAAAAAAAAAA1AM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 440880,
            "raisePct": 43,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 43,
            "completeCells": 169,
            "minimumCellOpportunities": 1181
          },
          "BTN": {
            "n": "jAUAAMUDAABeAwAAFwMAAC8DAABNAwAAMAMAAEEDAAAvAwAARQMAAAgDAAALAwAALgMAAA4KAADgBAAAYAMAAAYDAAAwAwAAIQMAACoDAAAOAwAAUQMAAPQCAAAJAwAAHgMAACADAACHCgAAYwkAAHwEAAAyAwAAMgMAAAkDAAAnAwAA0gIAANMCAADxAgAA/gIAAM4CAADnAgAAlgoAAAAKAAAcCQAA9QQAAA8DAAAPAwAAQAMAABEDAADsAgAAEgMAAAMDAADBAgAAFAMAAHMKAAAbCgAAlAkAALgJAACZBAAANwMAAOwCAADmAgAA5AIAAAADAADWAgAA8gIAALECAAD0CQAAmwkAAF4JAAA1CQAANAkAAJcEAAD0AgAA2AIAAN8CAADbAgAA9AIAAO8CAADiAgAAwwkAAHcJAAAzCQAAjwkAAAAJAAAcCQAAZQQAANoCAADpAgAA2AIAAA8DAADDAgAAzAIAAOUJAAAcCQAA9ggAAAIJAADdCAAAtQgAAPsIAACnBAAA6QIAAM0CAADIAgAA9AIAAN4CAADMCQAA/wgAANwIAADxCAAA1ggAANQIAADOCAAAoggAAF8EAADQAgAAmgIAAL0CAAD4AgAAxAkAALkIAAARCQAAJgkAAAMJAACgCAAAhwgAAG4IAAB/CAAAVgQAANkCAAB9AgAAvwIAALwJAAD/CAAAnAgAAIkIAACkCAAAvQgAAIsIAAB0CAAAZAgAAAYIAABOBAAAsQIAAJQCAABBCQAAGgkAAMIIAAClCAAA3wgAALYIAACYCAAA/gcAAGcIAAAuCAAAHQgAADUEAADXAgAAxgkAANwIAADJCAAAbQgAAHIIAACmCAAAXQgAAKkIAAAvCAAAbggAACUIAAABCAAAOwQAAA==",
            "r": "6APoA+gD6APeA+gD6APoA+gD6APoA+gD3gPoA+gD3gPoA+gD6APeA94D3gPeA94D3gPUA+gD6APoA+gD6APoA+gD6APUA94DygOsA7YD6APoA+gD6APoA94D3gPeA7YDtgOYA44DUgPoA+gD6APeA+gD6APoA94DtgNcAwwD2gKUAugD1APKA8ADwAPoA94D3gPKA3ADxgKKAjAC3gOsA2YDZgM+A3oD6APeA9QDogMMA2IC/gHeA1wDbAJiAhICbAIWA94D6APKA4QDsgLqAdQD5ALCAfoA+gAiAfQBngLoA9QDtgM0A2wC1AOAAkoBqgBaAG4AqgBAAQgC3gPUA1wDgALKAyYCDgGMADwAMgA8AG4A3AB8AegDcAOKAsAD1gHmAHgAKAAoAB4AKABGAFoAeADeAzoCrAOGAb4AWgAeAB4AHgAUAB4AHgAoABQA3gM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 254598,
            "raisePct": 65,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 65,
            "completeCells": 169,
            "minimumCellOpportunities": 637
          },
          "SB": {
            "n": "HAIAAGYBAABpAQAARgEAAFABAABOAQAAMgEAAEoBAABMAQAAbQEAAEwBAABGAQAALgEAAFwEAAAQAgAAUgEAAGwBAABWAQAAOgEAAD0BAAAsAQAAPgEAAC0BAAA3AQAAUwEAAC4BAAADBAAA9AMAAM4BAABQAQAASgEAAFEBAAA8AQAAHAEAAEIBAABRAQAANwEAACQBAAA0AQAATgQAAAgEAACzAwAA+wEAADoBAAA9AQAALAEAAC8BAAAZAQAAIwEAAEYBAAA0AQAAHAEAAFMEAADkAwAA9QMAAOUDAADmAQAAUgEAAD8BAAA5AQAAOAEAABgBAAAvAQAAIgEAAEEBAAAjBAAAwgMAANsDAACWAwAAtQMAANgBAAAnAQAAMgEAACABAAAPAQAAGgEAAPEAAAA3AQAA8QMAAJ0DAACzAwAA4AMAALEDAADKAwAAvwEAAEMBAAARAQAAJwEAABQBAAAtAQAASwEAAN0DAACnAwAApwMAAIEDAABrAwAAbAMAAIADAADMAQAAIQEAAB8BAAAcAQAAGwEAACwBAAAhBAAAnAMAAM8DAACwAwAAewMAAGMDAABsAwAAYgMAALMBAAABAQAAEwEAAA0BAAATAQAA4gMAAHgDAACNAwAAlAMAAGcDAAB7AwAAdwMAAG4DAAA7AwAAnQEAAB0BAAAnAQAACAEAAAYEAACzAwAAkAMAAFADAABzAwAAVwMAAHEDAAB6AwAAMAMAAEUDAACyAQAAIQEAAAYBAAADBAAAsQMAAG4DAAByAwAAawMAAGwDAABbAwAAMAMAADQDAAAeAwAA6gIAAJIBAAAbAQAA9AMAAIoDAAB2AwAAmQMAAJQDAABXAwAANgMAADsDAAA8AwAAIwMAABwDAAA5AwAAZAEAAA==",
            "r": "FgNSA44DrANwA3oDNAP4AoACngK8AoACCAJSAyoDmAOOA1ID0AJsAv4BHALWAdYBuAHWAWYDcAMqAyADFgOKAjAC1gGaAbgBwgHCAbgBegMqA4oCXAMqA2wCCALgAcwBuAHgAcwB9AFIA54COgIIAoQDngJOAuABuAEcAvQB9AEIAu4COgLgAdYBrgFmA1gCTgLgAcIBEgK4AdYBqAImAuoBwgGaAZoBXANYAiYC4AHgAdYB4AGAAhICuAGkAYYBkAGQARYDngLMAeAB/gGaAToC9AG4AVQBLAFAAZABfAHGAjAC/gEmAswBMALWAYYBSgEEAQQBBAFKAVQBbAIIAtYB1gEmAsIBaAEsAcgA0gDmANIADgE2ARwCrgGaAQgC1gFoASIByAC+AKoAtADcAOYABAH+AdYBEgK4AUABDgGqAKAAlgB4ALQAoACqAIwA4AE=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "0gCMAFoAPABuAG4AqgDwAGgBSgEsAV4B4AGWAL4ARgBaAIwAGAFyAeoBwgESAggCJgIIAngAbgC0AL4AyABeAa4BCAJEAiYCJgIcAhwCbgC+AF4BjAC+AHIB4AEIAggCHAL0Af4B6gGWAEoBrgHWAWQASgGQAf4BJgLCAeoB4AG4AfoApAH+AQgCJgJ4AIYBmgH+ARwCwgH0AeABNgGuAeoBHAI6AkQCjACGAcIB9AH0AeABzAFeAbgBCAISAiYCMAJEAsgASgESAv4B1gEIAqQB1gHMAeABCAIcAjACTgIYAbgB6gGkAf4BrgHWAeABrgE2AYYB9AEmAmICfAHMAf4B/gHCAeABwgGGARgBtABAAbgBHAJYAsIBJgIcAtYBuAHCAV4B0gCCAIIAyABKAZoBrgHgAeABzAGuAaQBNgG0AIIAbgBaAKAAvgDIAL4A/gE=",
            "opportunities": 101553,
            "raisePct": 48,
            "shovePct": 0,
            "limpPct": 38,
            "rfiPct": 48,
            "completeCells": 169,
            "minimumCellOpportunities": 241
          }
        },
        "30-70": {
          "EP": {
            "n": "yRwAANMSAAD3EgAAvBIAAPASAAC4EgAAbBIAAJYSAAByEgAAahIAAGoSAAA3EgAApxIAABs5AABnHAAAlBIAAFsSAADQEgAAXxIAALsSAAApEgAAGBIAAAQSAAAyEgAAsxIAAAATAACDNwAAIDgAAI4cAABfEgAADxMAAJoSAABFEgAA6BEAAB8SAAAHEgAAfhIAADwSAAD6EQAAKzgAAOU3AABoNwAA6RsAAF8SAADOEgAAeRIAACMSAABcEgAAWRIAAGUSAAAvEgAAWxIAACo3AABmNgAA5TYAAC03AACrHAAAURIAAFISAABeEgAA9BEAAOARAABTEgAAMxIAAFQSAAAKNwAAxzcAAGM2AACXNgAA9zYAANkcAACbEgAA/REAAEASAAA3EgAAMBIAAGwSAABmEgAA6jYAACc3AADdNgAAgjYAAMY2AAClNgAAQRwAAAATAACiEgAAdxIAAGMSAAB5EgAAXBIAAFo3AABzNgAADzcAAFw3AACZNgAARzYAAFI3AADuGwAA3hEAAFUSAAAuEgAAbxIAAGgSAACRNgAA+DYAAH82AABQNgAAxzYAAL01AAAmNgAAWjcAAEMcAADQEQAA8REAAKESAACbEgAAIjcAAMo2AABWNwAAzjYAAAs3AACvNgAAtzYAAKk3AABANwAAvBsAADkSAAArEgAAihIAABg3AABANwAACzcAAOQ2AAB7NwAAyzYAANA2AAC4NgAA6zYAANY2AAAWHAAAlRIAAAQSAAC+NgAAYjcAACo2AACHNgAAIjcAAC03AADQNgAAsjYAAJk2AADBNwAAQjcAAJgbAACXEgAAtjYAAAQ3AADUNgAA0DYAAEI2AAB6NwAAIzcAALA2AADPNwAAeTcAAK02AABENwAAHBwAAA==",
            "r": "1APeA94D3gPeA94D3gPUA8oD3gPKA7YDmAPUA9QD3gPeA94DtgOoAq4B5gCgAFoAPAAoAN4D3gPeA94D1ANwA+ABRgAeABQAFAAKAAoA3gOiA1gC3gPUA1wDzAE8AAoACgAKAAoAAADUA5oB+gC+AN4DogO4ATwACgAAAAAAAAAAAEABFAAKAAoACgDeAyoDlgAUAAAAAAAAAAAAWgAKAAAAAAAAAAoA3gOyAmQACgAAAAAAAAAeAAAAAAAAAAAAAAAAANQDOgIyAAoAAAAAABQAAAAAAAAAAAAAAAAAAADKA64BFAAKAAAAFAAAAAAAAAAAAAAAAAAAAAAAegPSAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAOQCFAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAA6AgAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuAE=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAKAAoACgAKAAAAAAAKAAAAAAAAAAoACgAKAAoAAAAAAAAAAAAKAAAACgAKAAAAAAAAAAoAAAAKAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 1559353,
            "raisePct": 21,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 4560
          },
          "MP": {
            "n": "4BcAAH0PAAAWEAAANA8AAFkPAABqDwAATQ8AALEOAADiDgAAdw8AAJgOAACvDgAA1A4AABkvAADEFgAAlA8AANwOAACuDgAA3A4AAHUOAADODgAA4Q4AAMMOAABnDgAAzA4AAFgOAABXLQAAZi0AAGYXAABHDwAA7A4AANIOAACqDgAAcg4AAL4OAACyDgAAxA4AAB0OAAB0DgAATC0AACQsAACzLAAACRcAAJIOAAAzDwAA/Q4AAJYOAACqDgAAUA4AAGwOAADtDgAAlQ4AAAQuAABeLQAAQSwAADAsAAA/FwAApw4AAKoOAADKDgAAjQ4AALcOAACiDgAAjw4AAFYOAAD6LAAA5SsAADAsAABFKwAAHSwAAIMWAADSDgAAmg4AAEwOAACgDgAA0Q4AAJkOAAAtDgAAgSwAAO8rAAA/LAAAkCsAANIrAADIKwAA6xYAAAUPAADiDgAA2w4AAKYOAABYDgAAcA4AAMwrAACtKwAAsysAADMsAABJLAAA7ysAAEQrAACAFgAAlw4AAFAOAAAzDgAAmw4AALMOAADWKwAACSwAAIYsAAAZKwAAoSsAAEQrAABZKwAAOisAADEWAADHDgAALw4AAH0OAAA1DgAAeiwAAEMrAAA/LAAACiwAAO8rAAAgKwAAwSsAAPgqAAD4KwAA0RUAAGcOAABDDgAAyQ4AAFssAABFKwAAUisAAL0rAAAuKwAATCwAALYrAADIKwAAPisAAKgrAAAKFgAANg4AALAOAACTLAAA4ioAAMIrAAARKwAABisAAPYqAAAdKwAAxysAAMkqAADmKgAAUSsAAH0VAABODgAA9ysAAI4rAAAzKwAAJSsAAHwrAADhKgAATisAACorAAD8KgAADysAAEgqAABAKwAA4xUAAA==",
            "r": "3gPeA94D3gPeA94D3gPeA9QD3gPUA9QDwAPeA94D6APeA94D1AM+A54CwgFeAeYAoABuAN4D3gPeA94D3gO2A7wCqgBQADIAKAAeAAoA3gPUA1ID3gPUA6wDngKgABQACgAKAAoACgDeA8YCEgK4Ad4DygOUAngAHgAKAAAAAAAAAFgCKAAUABQAFADeA3oDQAEyAAoACgAAAAAA+gAKAAoACgAKAAoA3gM0A8gAFAAKAAAAAABQAAoAAAAAAAAAAAAAAN4D2gJkABQACgAAACgAAAAAAAAAAAAAAAAAAADUA04CMgAKAAAAMgAAAAAAAAAAAAAAAAAAAAAAtgNKAQoAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAGYDHgAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAADQAgAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWAI=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAKAAoACgAAAAoAAAAAAAAAAAAKAAAACgAKAAoAAAAAAAoAAAAAAAAAAAAKAAAAAAAAAAoAAAAKAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 1243549,
            "raisePct": 24,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 24,
            "completeCells": 169,
            "minimumCellOpportunities": 3613
          },
          "HJ": {
            "n": "AxMAAPsLAABADAAALQwAAFcMAAAhDAAA6QsAAHkLAACdCwAAqQsAANMLAAC5CwAAnAsAAI4kAAATEgAANQwAAN0LAADgCwAA4AsAACYLAAAzCwAADwsAAEkLAABrCwAAXAsAAB4LAACuIwAAGSMAAAESAACkCwAAJgsAAHALAAB3CwAApQsAAEgLAACJCwAAmQsAAM0KAAAECwAAOiQAADYjAAC9IgAAoBEAAB0MAAApCwAAYwsAACwLAAA0CwAAKAsAAM8KAAB3CwAANAsAAKEjAABJIgAAlCIAAGUiAAAlEgAAigsAAHsLAABGCwAAbQsAAHALAABECwAAXgsAADwLAAB7IwAAkyIAAJkiAACnIQAA1iEAAOkRAACaCwAA+AoAAA8LAAC3CgAA6AoAAEwLAADeCgAAGSMAAPYhAACpIQAAcSEAAKshAACuIQAAHhEAAI4LAABjCwAAFQsAAA8LAACzCgAA5AoAAMoiAAABIgAAJCIAADghAABCIQAARSEAAOcgAAAKEQAAEgsAAM8KAAD0CgAAPwsAABALAAB4IgAA2SEAAPAhAAD8IQAAkyAAAEkhAAA8IQAASiAAAPAQAADqCgAA7woAAD4LAADrCgAAwSIAACghAACJIQAAryEAAH0hAADuIAAAhCEAALMgAACYIAAAOxEAACoLAAAACwAA2AoAANIiAABHIQAAxSEAACYhAADWIQAA7yAAADUhAABMIQAAtSAAAEggAABIEAAAvAoAABcLAABKIgAASiIAAJ8hAACXIQAAISEAAGkhAAAPIQAA+CAAAPMgAAAtIAAAdiAAAGUQAABfCwAAviIAACAhAAC7IQAAbCEAACghAABmIQAAYSAAAOAfAAD9IAAAMCAAAB0gAABLIAAATBAAAA==",
            "r": "3gPeA94D6APoA94D3gPeA94D3gPeA94D1APeA94D3gPeA94D3gO2A3ADDAOoAjoCpAFKAd4D6APeA94D3gPUA3ADEgIYAcgAjABkAEYA3gPeA8AD3gPeA8oDcAPgAVoARgAoAB4AHgDeA6IDSAMCA94D1ANcA6QBeAAeAAoACgAKAIQD5gCCAGQAeADeA6wDdgKgACgACgAKAAoAsgIoAB4AFAAUAB4A3gOYA+oBWgAUAAoAAAByARQAAAAKAAAAAAAKAN4DcAM2ATIACgAAAKAACgAKAAAAAAAAAAoACgDeAwwDoAAUAAoA0gAKAAAAAAAAAAAAAAAAAAoA1AM6AjIACgB4AAoAAAAAAAAAAAAAAAAAAAAAAKwDUAAKAFoAAAAAAAAAAAAAAAAAAAAAAAAAAABwAwoARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAKAAoAAAAAAAAAAAAAAAAAAAAKAAAACgAKAAoAAAAKAAAAAAAAAAoAAAAAAAAAAAAAAAoAAAAKAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 956694,
            "raisePct": 30,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 30,
            "completeCells": 169,
            "minimumCellOpportunities": 2739
          },
          "CO": {
            "n": "cw4AADQJAAAGCQAADwkAABMJAADoCAAAvAgAAJgIAACVCAAA2ggAABkIAACKCAAAJggAAJIbAABIDQAA5AgAAAMJAACRCAAATwgAAAsIAABvCAAARQgAABsIAACDCAAABwgAADYIAADuGgAApRkAABQNAAB+CAAAqAgAAFkIAAB4CAAAOggAACgIAADpBwAA8wcAAAkIAAAfCAAATRsAANwZAAB0GQAA/wwAAHAIAAB4CAAAMAgAAE4IAAAFCAAAOggAAEgIAAD5BwAAkAgAAKMaAABtGgAAgBkAACIZAAD4DAAAVQgAAC0IAABNCAAA2QcAADYIAADDBwAAMAgAAPEHAAAoGgAAVRkAAM8YAAByGQAAZhgAAHMMAAAXCAAAFggAAPgHAADYBwAAvwcAAIUHAADNBwAAqRkAAD4ZAAA8GAAAyRgAAEMZAABzFwAAXwwAABgIAABCCAAA6AcAANMHAAAqCAAAiAcAAI4ZAADlGAAAnRgAAH8YAAA0GAAA0RcAAFkYAAA3DAAA3AcAABoIAADwBwAA3gcAAMUHAACPGQAAjxgAAJkYAABhGAAAixgAALsXAAABGAAAkBcAAJoLAADqBwAA6QcAAOsHAAC9BwAAihkAAO0YAACaGAAAahgAAFgYAAClFwAAhRcAACsXAAAFFwAA+AsAALUHAADBBwAAtwcAADIZAABLGAAAcRgAADcYAAD0FwAA8hcAALoXAABXFwAAehcAABQXAADkCwAADQgAAMsHAABiGQAAZhgAABsYAABAGAAA6xcAAM8WAABKFwAAThcAABcXAAA+FwAA+BYAAKoLAADsBwAAsBkAAEsYAAAfGAAAGBgAAPkXAAAPFwAAGhcAAFYXAAAUFwAA2hYAACQXAABXFwAAuwsAAA==",
            "r": "3gPoA+gD3gPeA+gD3gPeA94D3gPeA94D3gPoA94D3gPeA+gD3gPUA9QDrAOsA4QDSAMMA+gD3gPoA94D3gPeA9QDegMgA9oCdgI6AswB6APeA94D6APUA94DygNSAxICuAFUAfoAyADeA94DygO2A+gD3gPKAyAD1gG0AHgARgA8AN4DAgOeAmICOgLoA9QDhAM6AtwARgAyACgAwANyARgB+gC0AA4B6APKAz4DhgGCAB4AFAB6A7QAKAAoAB4APACCAN4DtgOUAg4BUAAUAO4CRgAUAAoACgAKAB4ARgDeA5gD6gGWADIAKgMyAAoACgAAAAAACgAUAB4A1AMWA9IAPAC8AigACgAKAAAAAAAAAAoACgAUAMoDNgE8AE4CHgAKAAAAAAAAAAAAAAAAAAAAAAC2A0YA9AEUAAoAAAAAAAAAAAAAAAAAAAAAAAAAjgM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "CgAAAAAACgAKAAAAAAAKAAAAAAAKAAoAAAAAAAAAAAAKAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 693244,
            "raisePct": 41,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 41,
            "completeCells": 169,
            "minimumCellOpportunities": 1925
          },
          "BTN": {
            "n": "qQkAACIGAABUBgAAAAYAANcFAADTBQAApwUAAHgFAACiBQAAewUAAGwFAABDBQAAmgUAAFMSAAC6CAAAgAUAAKkFAACXBQAARAUAAEIFAAB4BQAAeAUAADwFAABGBQAAQwUAAC8FAABuEQAALBEAAEQIAACuBQAASAUAADcFAABDBQAAJgUAAFoFAABDBQAAEQUAAE8FAAA2BQAA6xEAAJ0QAAC+EAAAjwgAADUFAACLBQAAKgUAABsFAABDBQAANwUAAAwFAADxBAAA9gQAAP4QAADCDwAAvhAAAC0QAAB8CAAAiwUAADUFAAAWBQAALAUAABAFAABKBQAACAUAAPEEAAAoEQAAfxAAAPYPAADbDwAABBAAAAoIAABnBQAAAgUAABkFAADZBAAARQUAAN0EAADaBAAAixAAACwQAAAAEAAAzw8AAL0PAABVDwAABggAAEAFAADnBAAA9QQAAMoEAADEBAAABAUAAPUQAAD7DwAAGRAAALgPAAAzDwAAag8AACoPAACJBwAAOQUAANsEAADXBAAApgQAANsEAAAmEQAAaA8AAGIPAAB0DwAAag8AAC4PAAAIDwAA4Q4AAIIHAADeBAAADwUAACEFAAC+BAAAhBAAALMPAABbDwAAxQ8AAHEPAADbDgAA4Q4AAOIOAABkDgAAPQcAAN4EAACJBAAA0QQAAKMQAAA0DwAAVQ8AADoPAAANDwAAjQ4AAJ0OAACBDgAAiA4AAHIOAAA7BwAA/wQAANcEAADeEAAAQQ8AANUOAADsDgAACg8AAPQOAAAfDgAAzQ4AAG8OAABEDgAAPA4AAAEHAADYBAAAbhAAANIPAABQDwAAXw8AALwOAABMDgAAfg4AAPQOAABfDgAALg4AADMOAAB5DgAAMgcAAA==",
            "r": "3gPoA+gD6APeA94D3gPeA+gD1APeA94D3gPoA+gD6APoA94D3gPeA9QD3gPUA9QDygPAA+gD6APoA94D3gPUA94D1APAA7YDrAOYA44D6APeA94D6APUA94D1APKA6IDegNSAz4DDAPeA94D3gPUA94D1APKA8ADegMCA6gCYgImAt4D1AO2A6IDhAPoA8oDwAN6AxYDWAISArgB3gOOAzQDIAPaAioD6APKA7YDXAOyAvQBpAHeAzQDMAISAsIBCAKeAugDygOsA/gCOgJ8AcoDsgKGAdwA0gD6AJABEgLeA8ADXAOeAuAB1ANYAiwBoABQAGQAoAAYAaQB1AOsA8YCCALAA/QB+gBuADIAKAA8AG4AqgAYAdQD0ALMAawDuAHIAG4AKAAeAB4AHgA8AFAAWgDAA64BmANyAaoAZAAoAB4AHgAeAB4AKAAeAB4ArAM=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "AAAAAAAAAAAAAAAACgAKAAAACgAAAAoACgAAAAAAAAAAAAoACgAAAAoACgAKAAoACgAKAAAAAAAAAAoACgAKAAoACgAKAAoACgAKAAAAAAAKAAAAAAAKAAoACgAKAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAUAAoACgAAAAAAAAAAAAAAAAAAAAAACgAAABQAFAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAUAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 440726,
            "raisePct": 62,
            "shovePct": 0,
            "limpPct": 0,
            "rfiPct": 61,
            "completeCells": 169,
            "minimumCellOpportunities": 1161
          },
          "SB": {
            "n": "oAQAAL0CAADsAgAAtgIAANECAAC1AgAAuwIAALQCAABrAgAAgwIAAHUCAACWAgAAegIAAIAIAADxAwAAkwIAAKQCAACEAgAAiAIAAIQCAABhAgAAZAIAAFwCAAA+AgAATgIAAFsCAACqCAAAzQcAAA0EAACRAgAAhAIAAHYCAACQAgAAMAIAAF8CAAB9AgAAkQIAAEYCAABBAgAAOwgAAIEHAACRBwAA2wMAAKUCAABlAgAAZQIAAE8CAABtAgAAbQIAAGsCAAAqAgAAFwIAAOsHAACSBwAAjgcAAEwHAADeAwAAdwIAAEECAABCAgAAVAIAADoCAABNAgAAVgIAAH4CAAAzCAAAtwcAAC4HAAAbBwAADgcAAMEDAAA6AgAARAIAAGICAAAwAgAAIgIAABwCAAA/AgAADwgAAKsHAAB/BwAA7AYAABIHAAAXBwAAZQMAAF4CAABPAgAATwIAAE8CAAAfAgAAFAIAAPUHAABuBwAAtwYAAAoHAAD6BgAApAYAAG0GAABwAwAASQIAAEACAAAsAgAACQIAAB8CAAAiCAAAaAcAABwHAADHBgAAxwYAAPIGAACFBgAAbAYAAFkDAAAuAgAACwIAAAYCAAAtAgAAfwcAADkHAADQBgAAtwYAAPQGAADTBgAAiQYAAHMGAABtBgAAUAMAABUCAAAXAgAAIwIAAM0HAAA1BwAA2QYAACIHAAD2BgAAfAYAAHYGAAAoBgAA9gUAADcGAAA8AwAAIwIAAAgCAACoBwAAMQcAALIGAAC3BgAAggYAAKgGAABQBgAAiAYAAHYGAABfBgAAWQYAABQDAAAJAgAAlgcAAO4GAACsBgAAvAYAAIcGAACDBgAAagYAAEIGAAAfBgAAFgYAAAwGAAAFBgAAFAMAAA==",
            "r": "PgNmA2YDXANcAwwDqAJiAiYCEgIIAuoB1gE+A0gDUgMgA4oCRALqAdYBpAGuAaQBhgGaAUgDKgNIA8YCWAL+AbgBhgFoAYYBmgGGAa4BSAPuAk4CXANEAuABpAFeAZoBpAGkAcwBzAEWA1gC/gHWAT4D6gGkAYYBkAGuAcIB6gHMAagC9AHMAYYBaAE0A8wBcgGuAa4BmgH0AeoBbAL0AcwBpAFyAXIB5AKkAZABrgGaAcwBwgEwAggCzAHWAYYBhgFoAbwCzAF8AaQBzAHMARIC/gG4AYYBaAFeAV4BaAEcAqQBpAHMAa4B/gESAq4BcgEOARgBGAFUAVQB1gGaAbgBuAEIAuoBmgFoAfoA8AAYAQQBNgFUAZABuAHMAeoB6gGQAVQB0gC+ANIA3ADmAA4BBAFUAYYB9AHgAXwBLAHSALQAqgC+AL4AyAC0ALQAVAE=",
            "j": "AAAAAAAAAAAAAAAAAAAAAAAACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAABQACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "l": "oACCAIIAggCCANwAQAF8AcIBzAHgAfQBEgKgAKAAlgDIAF4BpAH+ARICRAI6AkQCYgJEApYAtACWACIBkAHqATACWAJ2AlgCRAJYAjACoAD6AJABjACkAf4BRAKAAkQCOgIwAhICCALSAJAB6gESAqoA9AFEAlgCTgIcAhIC1gHgATYB6gESAk4CdgK0ABwCdgI6AiYCJgLCAbgBcgHqAQgCMAJiAmwCBAE6Ak4CMAI6AswB1gGuAcwB4AHqASYCOgJsAhgBEgJiAjoC9AHCAcIBwgHCAZoB4AH0AUQCYgK4AToCOgL+Af4B4AGkAa4BkAE2AV4B1gESAlgC/gFOAhwC9AHWAbgBpAFeAeYAtAAOAYYB4AEwAjACJgL0AeoBrgF8ATYByACWAIIAyABAAXIBkAFsAhwC4AGkAXIBIgGqAHgAZABaAJYAqgDIAKoAbAI=",
            "opportunities": 198662,
            "raisePct": 46,
            "shovePct": 0,
            "limpPct": 40,
            "rfiPct": 46,
            "completeCells": 169,
            "minimumCellOpportunities": 518
          }
        },
        "20-30": {
          "EP": {
            "n": "UggAAHIFAABqBQAAlgUAAFgFAABIBQAAeAUAAHoFAABTBQAAMwUAAHMFAABvBQAAYgUAANMQAACCCAAAdwUAAIMFAABFBQAATQUAAGAFAABEBQAALgUAAGAFAAAfBQAAVAUAAIUFAAClEAAAQhAAABYIAABvBQAAZAUAAHgFAABaBQAAuQUAAGwFAABoBQAAXAUAAFEFAAB7BQAAYxAAAHQQAAAhEAAAZQgAAH0FAABPBQAAdQUAAGQFAACABQAAfQUAAHEFAAByBQAAhgUAAGkQAAAGEAAA6Q8AACMQAAA4CAAAUwUAAIsFAAB6BQAAKgUAAEgFAABTBQAAgAUAAHYFAABTEAAAERAAAD8QAABIEAAAAxAAAE8IAABmBQAAigUAAG0FAAA1BQAAUwUAACwFAABfBQAAphAAAA0QAAA+EAAAJRAAAAAQAABeEAAAWAgAAGUFAAB/BQAAIgUAADsFAABwBQAAcwUAAO8QAAAoEAAADRAAAE8QAAAsEAAAmQ8AAD4QAAAECAAAjgUAAFIFAABQBQAANAUAAGIFAADeDwAAXxAAAIgPAAB3EAAAWRAAACkQAAC6DwAA1A8AADsIAAAgBQAAbgUAADkFAACMBQAAyg8AAMIPAABcEAAAVxAAAHoQAABLEAAAKhAAAHUQAACEEAAATggAAHoFAABcBQAAgwUAAPsPAABYEAAA5g8AAFcQAAAqEAAA3g8AADgQAAAWEAAA8g8AADQQAACYCAAAgQUAAG8FAABHEAAAkQ8AAEoQAAAkEAAAjg8AAEYQAADkDwAAFRAAABQQAACBEAAAMhAAAA4IAACZBQAAERAAAHUQAABIEAAALxAAAPYPAAByEAAAYRAAAPAPAACwDwAAKRAAALwPAABzEAAA8gcAAA==",
            "r": "ygO2A8oDwAPAA9QDtgOEAz4DegMqA+4CqAK2A9QDygPKA7YDAgNUAaAAPAAoAB4AFAAKALYDygPUA8ADogNYAr4AFAAKAAoACgAKAAAA1AMWA1QBwAOEA/QBoAAUAAoAAAAAAAAAAACiA9IAWgAyAKwDYgJ4AAoAAAAAAAAAAAAAAL4ACgAKAAoAAACiA0oBKAAKAAAAAAAAAAAAMgAAAAAAAAAAAAAAjgO+AB4AAAAAAAAAAAAUAAAAAAAAAAAAAAAAAHoDggAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAADuAloACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAzAEeAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAA=",
            "j": "AAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "FAAeABQAHgAeAAoAFAAUAAoAFAAUABQAFAAoABQAFAAUAB4AFAAKAAAACgAKAAAAAAAAAB4ACgAUAB4AKAAUAAoAAAAAAAAAAAAAAAAACgAKAAoAHgAyACgACgAKAAAAAAAAAAAAAAAKAAAACgAAACgAMgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 457978,
            "raisePct": 17,
            "shovePct": 0,
            "limpPct": 1,
            "rfiPct": 17,
            "completeCells": 169,
            "minimumCellOpportunities": 1311
          },
          "MP": {
            "n": "8QYAACwEAACfBAAAVAQAAKoEAABZBAAAkQQAAGcEAACHBAAAbwQAAJUEAABXBAAAiQQAAGgOAAC4BgAAdgQAAHAEAACrBAAAbwQAAGcEAABcBAAATQQAAGcEAAA4BAAAkgQAADEEAADUDQAAZQ0AAL0GAABxBAAAgQQAAD4EAAA9BAAAYAQAAIkEAAB8BAAAMQQAACcEAAAkBAAA3w0AAGANAACODQAAkgYAAJwEAABbBAAALAQAAFMEAABbBAAAZgQAAHgEAABCBAAAMQQAAFwNAAAXDQAA/AwAAGANAAC9BgAAaQQAAF0EAABiBAAAMAQAADoEAABABAAATwQAAHwEAACeDQAAPQ0AAA4NAADlDAAApwwAAPkGAAADBAAARwQAAHAEAAA7BAAAKgQAACMEAACaBAAAGw0AADMNAAAJDQAAdQ0AABoNAADZDAAAsQYAAFMEAAAnBAAAQAQAAHYEAABFBAAAFAQAAAgNAABRDQAASw0AABsNAAAwDQAADA0AAAwNAABmBgAAcAQAAEMEAAB0BAAAPwQAAFEEAADLDAAAWA0AADkNAAAsDQAA7AwAANgMAAAFDQAA5QwAAGYGAAAmBAAAVgQAAE4EAAAkBAAAFw0AAE0NAAAIDQAApAwAADkNAADBDAAA4wwAAEMNAAAMDQAAbgYAAIIEAABSBAAAQAQAAP4MAADzDAAAywwAANwMAAC5DAAA8AwAABYNAAAzDQAA2AwAAAcNAAB7BgAASwQAACIEAAAWDQAAMg0AAJgMAAA0DQAAtQwAANoMAACnDAAAzQwAALAMAADhDAAAqwwAAHcGAABdBAAAcQ0AAPkMAAAiDQAAUQ0AANMMAADRDAAAFQ0AAKUMAAD5DAAAJw0AAK4MAAB/DAAAhAYAAA==",
            "r": "1APKA8ADygPKA8oDwAOsA3ADmAOOA1IDNAPAA9QDwAPKA8ADXAMcAlQBtAB4AEYAPAAoAMAD1APKA7YDrAPuAlQBPAAoABQACgAKAAoAygOEA1gCwAOiA54CNgE8ABQACgAKAAAAAADKA8wB8AC0AMAD+ALwAB4ACgAAAAAAAAAAAK4BHgAKAAoACgCsA8IBPAAKAAoAAAAAAAAAoAAKAAoAAAAAAAAAogNUATIACgAAAAAAAAAyAAAAAAAAAAAAAAAAAIQD0gAeAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAgA6oACgAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAbAI8AAoAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAHwBCgAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAA=",
            "j": "AAAKAAoACgAKAAAAAAAAAAoAAAAAAAAAAAAUAAAACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "l": "FAAUABQACgAUABQAFAAUAAoAHgAUABQACgAUABQAFAAUABQAFAAUAAoAAAAKAAAAAAAAABQACgAUACgAKAAUAAoACgAAAAAAAAAAAAAAFAAKAAAAHgAyAB4ACgAAAAAAAAAAAAAAAAAKAAoACgAAABQAKAAUAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAoADwACgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "opportunities": 369705,
            "raisePct": 19,
            "shovePct": 0,
            "limpPct": 1,
            "rfiPct": 20,
            "completeCells": 169,
            "minimumCellOpportunities": 1027
          },
          "HJ": {
            "n": "dgUAAN0DAADDAwAA3AMAAOYDAACaAwAAdwMAAI8DAACrAwAAiAMAAIMDAABmAwAAigMAAAULAABpBQAAagMAALkDAACRAwAAlAMAAIEDAAB2AwAAWAMAAHUDAAB/AwAAfwMAAEkDAAAyCwAAsgoAAJQFAACWAwAAcwMAAFwDAABqAwAAYgMAAGIDAABrAwAAZwMAAJwDAAAyAwAA2woAAN4KAAAGCwAAcQUAAJIDAABNAwAAYQMAADwDAAB9AwAAawMAAEcDAACBAwAAcQMAAMQKAACkCgAAuQoAAHoKAABwBQAAiwMAAIIDAABgAwAAcQMAAHcDAACJAwAAnAMAAHUDAACaCgAARwoAAFAKAAB9CgAAQAoAAFkFAACUAwAAgAMAAIMDAABOAwAAOgMAAIADAABzAwAArQoAAI0KAAC1CgAAcAoAAJYKAAAyCgAAJQUAAFcDAAB/AwAAiAMAAFgDAABoAwAATAMAAOoKAACeCgAApQoAAC4KAAA2CgAASQoAAGIKAABVBQAAWgMAAGUDAAB5AwAAQAMAAI4DAADnCgAA3QoAAGYKAAB4CgAA8AkAAHsKAABtCgAAQAoAABEFAABTAwAAbwMAAG0DAAB6AwAA4AoAAIAKAAARCgAAXgoAADQKAABxCgAAPwoAAOgJAAAzCgAAIQUAAGkDAAA9AwAAMgMAAIsKAAB0CgAALAoAAAgKAAAwCgAA6gkAABMKAABMCgAA8wkAACsKAAACBQAAaAMAAEYDAABsCgAAYwoAABIKAABrCgAAYwoAAAMKAAAeCgAANQoAAPYJAAAWCgAATgoAADcFAAAOAwAAqQoAAFkKAABjCgAANQoAAHwKAAD+CQAAvwkAAO4JAADjCQAAKQoAAPYJAAD0CQAA6AQAAA==",
            "r": "1APUA9QD1APKA9QDygPAA7YDtgOYA5gDhAPAA9QDygPAA6wDrAMWA4oC6gFyAQQBvgCMAMADygPUA6wDtgNwA4AC8ABuAFAARgA8AB4AygPAA0gD1AOYAz4DOgLIADIAHgAUABQACgDKAwIDWALWAcoDPgPqAaAAMgAKAAoAAAAAACADbgAyACgAMgC2A4oC+gA8ABQACgAKAAoACAIeABQAFAAKAAoAogP+AaAAHgAKAAoAAADmABQACgAKAAoAAAAKAI4DmgFQABQACgAAAGQACgAAAAAAAAAAAAAACgBmAywBMgAKAAAAjAAKAAAAAAAAAAAAAAAAAAAA7gKMABQACgBaAAoAAAAAAAAAAAAAAAAAAAAAAE4CFAAKADIAAAAAAAAAAAAAAAAAAAAAAAAAAACQAQoAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAE=",
            "j": "AAAKAAoACgAUAAAAAAAKAAAACgAKAAoACgAUAAAAFAAKABQAAAAAAAAAAAAAAAAAAAAAABQACgAAABQACgAKAAAAAAAAAAAAAAAAAAAACgAAAAAACgAKAAoAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAHgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "CgAKAAoACgAKAAoAFAAUABQAFAAeAB4AFAAUAAoACgAeAB4AFAAeAAoACgAKAAoACgAAAAoACgAUAB4AHgAeABQAAAAAAAAACgAAAAoACgAKAAoACgA8ACgAHgAKAAAAAAAAAAAAAAAKAAAACgAKABQARgAeAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAEYAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKABGAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgA=",
            "opportunities": 293615,
            "raisePct": 24,
            "shovePct": 0,
            "limpPct": 1,
            "rfiPct": 25,
            "completeCells": 169,
            "minimumCellOpportunities": 782
          },
          "CO": {
            "n": "lAQAADYDAADdAgAAFgMAAPMCAAAWAwAA0gIAAPACAADmAgAAtwIAANICAADNAgAA1QIAAPoIAABOBAAAswIAAP0CAADtAgAAiwIAAM4CAADLAgAArwIAAMcCAACYAgAApwIAALACAAALCQAAYAgAAF4EAADNAgAA6wIAAM8CAACLAgAAjgIAAKcCAADFAgAAqgIAANcCAADOAgAA5AgAAIcIAABQCAAAfQQAANUCAADUAgAAqwIAALwCAAC3AgAAswIAANECAADBAgAAhwIAAGAIAAA5CAAAXwgAAGkIAAA3BAAApgIAALECAADeAgAAnwIAAKMCAACkAgAAuAIAAKsCAACJCAAALwgAACsIAAATCAAAAwgAAAUEAADPAgAApQIAAJsCAAB2AgAAfwIAAHYCAACKAgAA0QgAAPMHAAD5BwAAGggAAOoHAAD5BwAAAQQAALUCAACFAgAAgQIAAEACAACAAgAAbQIAAIwIAABICAAA5wcAABAIAADHBwAAzAcAAB4IAAD9AwAAiAIAALcCAABwAgAAlAIAAJoCAADICAAA0gcAADAIAADxBwAAEQgAAPEHAADTBwAAeAcAAN4DAABqAgAAgwIAAIwCAACIAgAAgAgAAOcHAAAMCAAAFAgAAB0IAAC7BwAA5gcAAJoHAACLBwAACgQAAI4CAACUAgAAjwIAAFkIAABJCAAA1QcAANAHAAC9BwAAeAcAAO0HAADFBwAA2AcAANwHAADAAwAAoAIAAH8CAAB4CAAABAgAAOQHAADhBwAAxwcAAMYHAAC1BwAArwcAAAUHAAClBwAAsgcAAL8DAAB5AgAA/QcAABsIAAC5BwAAgAcAAJwHAADLBwAA6AcAAK8HAACQBwAAbwcAAKIHAACfBwAACAQAAA==",
            "r": "3gPUA8oDygPKA8oDwAPAA7YDrAOsA7YDmAPUA94DwAOiA6IDwAOOA2YDFgPkAooCWALMAcoDwAPeA3oDmAOiA3ADYgLCAZoBSgEYAdwAwAPAA7YD3gOOA4QDIANOAhgByACgAIIAbgDKA6wDXAMWA8ADhAPuAsIByABGADwAKAAeAKwDHAJ8AUABGAHAAwwDOgIOAXgAKAAeABQAhAPcAIwAeABaAHgAtgPuAq4BjABGAB4ACgAWA3gAHgAoABQAHgA8AJgDdgIsAWQAHgAUAEQCMgAUAAoACgAKABQAHgBcA/QBvgA8AAoAbAIoAAoAAAAKAAoACgAKAB4AIAOGAUYAHgDqAR4ACgAAAAAAAAAAAAoACgAKALwCeAAoAJABFAAKAAAAAAAAAAAAAAAKAAoACgBOAigAQAEUAAoACgAAAAAAAAAAAAAAAAAAAAAA/gE=",
            "j": "AAAKABQAFAAUABQAFAAUAAoAFAAeAAoAHgAKAAAAHgAeACgAFAAKAAAACgAAAAoAAAAKABQAHgAAADwAHgAKAAoAAAAAAAAAAAAAAAAAHgAUAAoAAAAoAAoACgAAAAoAAAAAAAAAAAAUAAoACgAKABQAFAAUAAAACgAAAAAAAAAAABQACgAAAAAAAAAeABQACgAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAHgAKAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAADIACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABkAAoAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAIIAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAA=",
            "l": "CgAKAAoACgAKAAoACgAKAB4AHgAKABQAFAAKAAoACgAeAB4AFAAeAB4AFAAUAAoACgAAAAoACgAKACgAMgAoAB4ACgAUAAoAAAAAAAAACgAKAAoAAAAoADIAKAAUAAAACgAAAAAAAAAKAAAACgAKAAoAPAAyABQACgAAAAAAAAAAAAoAAAAAAAoACgAKAEYAHgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAFABGABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4APAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAeADwAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAMgAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgA=",
            "opportunities": 227121,
            "raisePct": 34,
            "shovePct": 1,
            "limpPct": 1,
            "rfiPct": 35,
            "completeCells": 169,
            "minimumCellOpportunities": 576
          },
          "BTN": {
            "n": "pwMAAEgCAAA9AgAAHAIAAEYCAAAGAgAAVAIAABwCAAAOAgAAEwIAAAcCAAALAgAAIAIAAAQHAABWAwAALgIAAE4CAAAHAgAACQIAAAsCAAACAgAA3QEAAPoBAADXAQAA0gEAAAcCAADrBgAABwYAAFQDAAABAgAA+AEAAA4CAAAAAgAA2wEAAPoBAAD4AQAA7gEAAAMCAADjAQAAuQYAAPgFAAAYBgAABAMAAPcBAAAFAgAA8gEAAMoBAAAGAgAA7wEAANoBAAACAgAAzgEAAKoGAAAWBgAAbAYAABQGAAAFAwAA+QEAABcCAAC7AQAADgIAAMoBAADyAQAAGAIAAOYBAACoBgAA/AUAABAGAADxBQAAvQUAAO4CAADaAQAA4AEAAPgBAAD9AQAAxwEAAN4BAADiAQAAZgYAAAEGAAAOBgAAuwUAAKwFAAC6BQAA6gIAAA8CAADeAQAAygEAAOABAADzAQAA1gEAAJQGAAAdBgAAAAYAALwFAADlBQAAkwUAAIAFAADzAgAA3wEAANkBAADeAQAAywEAAPYBAACEBgAAFQYAAKAFAAANBgAAywUAAH0FAACkBQAATQUAAPwCAADMAQAA7QEAAMoBAADIAQAAlQYAAAMGAAC1BQAAtQUAALAFAABdBQAAiAUAAHEFAABdBQAA2QIAAM8BAADSAQAA3gEAAE8GAADpBQAAwAUAAM4FAACGBQAAdQUAAEQFAAB2BQAAfQUAAEMFAACuAgAAygEAAN8BAAD9BQAAjAUAAAIGAADHBQAAqwUAAHUFAACyBQAAZwUAAIAFAABRBQAAhgUAAMYCAADIAQAAMQYAALoFAADIBQAApQUAAJQFAACYBQAAmAUAAHcFAACMBQAAoAUAAFcFAABlBQAAtAIAAA==",
            "r": "3gPUA9QD1APUA7YDrAOsA3ADcANwA4QDcAPKA94DtgOOA1wDcAOsA6IDmAOOA3oDcANmA8oDmAPoA1IDSANmA3oDhANIAxYD7gLkAp4CygOOA5gD6AMgA1wDcAN6A+QCgAJEAhICEgK2A6wDogOEA9QDNANwAyoDgALCAZoBfAEsAY4DhAM0A/gCxgLKA0gDAgOKAtYBcgEEAfoAhAMCA2wCJgLgAf4BrAMWA/gCHAKaAUAB+gB6A2ICcgFUAQ4BQAGGAXoDKgOeAtYBDgHSAGYD1gH6AJYAeACgANIALAEgA9oCEgJeARgBcAN8AeYAZABGADwAZACqAOYA5AJ2ApoBDgFIA2gBlgBkADIAKAAyAEYAZACgAIoCkAEOATQDLAGMAEYAHgAeAB4AHgAyADwAPAAwAvAA+AL6AIIARgAeAB4AHgAUAB4AFAAeABQA/gE=",
            "j": "AAAKABQAFAAKACgAKAAyAFoAUABGAFAAWgAUAAAAKABGAFAARgAUABQAHgAUABQACgAKABQARgAAAG4AZAA8AB4AFAAKAAoAAAAAAAAAHgBGACgAAACCADwAKAAUAAoAAAAAAAoAAAAoAB4AHgAUAAoAWgAUAB4ACgAAAAAAAAAAAEYAFAAKAAoACgAUAB4ACgAKAAoACgAAAAAAUAAKAAAAAAAAAAoAMgAoAAoACgAAAAAAAABGAAoAAAAAAAAAAAAAAFoAFAAKAAoAAAAAADwACgAAAAAAAAAAAAAAAACqAAoAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAA5gAUAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAAAACwBCgAAADIACgAAAAAAAAAAAAAAAAAAAAAAAABAAQAAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANgE=",
            "l": "CgAAAAAAAAAKAAoAFAAKAB4AHgAoAAoAFAAKAAoACgAUADwAKAAeABQAHgAeABQAHgAeAAoACgAAACgAMgA8ADwAFAAUAAoAFAAeABQAAAAUAB4AAABGAEYAPAAeAAoAFAAKAAoAAAAKABQAFAAeAAoAUAAyACgAFAAUAAAACgAAAAoACgAKAAoAFAAKAG4ARgAeABQACgAAAAAACgAAAAoACgAAAAoACgBkACgAFAAKAAoAAAAKAAoACgAAAAAACgAKAAoAUAAyAB4AAAAKAAoAAAAAAAAAAAAAAAoACgAUAGQAKAAAAAAACgAAAAAAAAAAAAAAAAAAAAoAFAAyABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AFAAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAA=",
            "opportunities": 165508,
            "raisePct": 50,
            "shovePct": 2,
            "limpPct": 1,
            "rfiPct": 52,
            "completeCells": 169,
            "minimumCellOpportunities": 443
          },
          "SB": {
            "n": "PwIAAF8BAABOAQAAUwEAAD0BAABLAQAAUAEAAEsBAABKAQAAVQEAAEUBAAA7AQAASQEAAAYEAADyAQAAUAEAAD4BAAAxAQAALAEAACwBAAAmAQAAKgEAABsBAAAmAQAACAEAADEBAABOBAAA2gMAANkBAAA7AQAAFgEAABcBAAAhAQAALwEAABYBAAA2AQAAJgEAABsBAAAfAQAABgQAAM4DAACpAwAAAQIAACcBAAA+AQAAGwEAABUBAAArAQAAGgEAADwBAAD0AAAAIQEAABAEAADIAwAAvAMAAJYDAADQAQAAFAEAAB0BAAACAQAAIwEAADsBAAAYAQAAMQEAAA0BAADjAwAAjQMAALADAABAAwAAXgMAAM4BAAAZAQAAFQEAAAEBAAAPAQAAJAEAABIBAAD4AAAAFgQAAKYDAACkAwAAiwMAAI8DAABqAwAAvgEAAP8AAAAYAQAAHwEAAAcBAAAPAQAABwEAANwDAACvAwAAeQMAAKwDAACDAwAAQQMAAFMDAAB2AQAADwEAAAkBAAAsAQAA7wAAAPwAAADmAwAAgQMAAFMDAACTAwAAXwMAAFIDAAA3AwAAOQMAAIgBAAD3AAAAEgEAACQBAAAPAQAArgMAAHQDAAA1AwAARAMAAGwDAAAkAwAAJwMAAFgDAAAJAwAAnAEAAPcAAAAIAQAAGwEAAAcEAADAAwAAjwMAAFYDAAB3AwAALwMAAEMDAAAMAwAADAMAADwDAACbAQAAAQEAAAkBAADLAwAAdgMAAF8DAABVAwAARgMAAFoDAABNAwAA/gIAAEIDAAAFAwAA/gIAAHgBAAAPAQAAuAMAAHgDAABOAwAAdQMAAFwDAAAkAwAAAwMAAPYCAADiAgAA2gIAADkDAADeAgAAgwEAAA==",
            "r": "vAICA/gC0AKKAggC6gFyARgB8ADwAOYA8ADGAuQCxgIIAoYBSgHwAPAABAHwAOYAVAHwALICOgLkAnwBLAFAAdwABAHwAMgAGAEsAUABWALCAVQBFgPmANIA0gAEARgBNgFUAUoBXgEIAkABNgEEAdoC3AC0AMgANgFKAV4BaAGkAXIBfAE2ASIBLAGyAqoA5gDwAA4BSgFeAXwBXgF8AV4BQAE2ASIBJgLwAKoANgFUATYBIgEiAcIBkAGGAVQBNgEYAXIBtADSAA4BGAFUAfoAuAGGAXwBXgEsAUABLAHwAOYALAFyAUAB8ACuAZoBaAEYARgBLAFKARgBqgDcAA4BXgEEAdYBhgFUARgBDgEEARgBGAEiAWQAQAE2AQQBpAGuAWgBBAG+APAABAH6AAQB5gBaAF4B8ADMAYYBNgHSALQAvgC+ANwAyADSALQARgA=",
            "j": "AAAoAB4AMgBGAG4AbgCMANwA3ADcAL4ABAFQAAoAPABkAIIAlgCCAHgAbgBkAEYAUABGAGQAggAKANIAtACCAGQAKABGADwAMgAeAB4AjACgAIwAFAC0AL4AWgA8ADIAKAAeABQAFAC+AKAAeABuAB4A0gCMADwAHgAKABQAKAAUACIBWgAyADIAKAAyAJYAUAA8AAoAAAAUABQALAE8AB4AHgAUABQAggCMAFoAMgAKABQACgBAATIACgAKAAoACgAUANIAggAoACgAFAAKAEoBKAAUAAoAAAAKAAoAFABUAXgAMgAUAAoASgEeAAoAAAAAAAAAAAAAAAoA4AFGABQAFABAARQAAAAKAAAAAAAAAAAAAAAKAAgCHgAAACwBHgAKAAAAAAAAAAAAAAAAAAoAAAAIAgoALAEUAAoACgAAAAAAAAAKAAAAAAAAAAoAJgI=",
            "l": "LAG+ANIA3AAYAXIBkAHqAfQBHAIcAjoC9AHSAPoA5gByAeABCAJ2AnYCdgKUArICMAKyAtIALAH6AJABCAImAp4CsgKeAtAClAKKAooCBAF8Af4BvgBEAlgCsgKeAooCgAJiAmICWAIiAf4BMAJsAvAAOgKoAtoCigKKAkQCCALqAUoBCAJ2AoACgAIEAagCsgKoArICOgISAswBXgEcAlgCdgJsAp4CQAFsAtoCbAJYAlgCWAKGAeoB6gEIAiYCbAKeApoBqALaApQCOgL+AZoB4AHCAXIBrgHqAUQCbAKkAYoCgAIcAjACpAHWAZoBSgEOAUABkAESAlgCXgGyAooCHAKaAbgBfAEiAdIAlgDcAEoBrgEcAnIBRAJEAqQBuAFUARgBlgCWAHgAqgAEASIBXgF8ARwCwgF8AUABDgGMAG4AZABGAGQAlgCgAJYAcgE=",
            "opportunities": 97154,
            "raisePct": 34,
            "shovePct": 8,
            "limpPct": 43,
            "rfiPct": 42,
            "completeCells": 169,
            "minimumCellOpportunities": 239
          }
        },
        "15-20": {
          "EP": {
            "n": "+QMAALYCAAB9AgAAawIAAIoCAACsAgAAjwIAAHMCAACgAgAAeAIAAFoCAACFAgAAdQIAAJQHAADhAwAAowIAAIQCAABjAgAAbgIAAJYCAAB7AgAAZQIAAHICAACVAgAAiwIAAH0CAAB/BwAAgQcAAO0DAACCAgAAtQIAAGMCAACGAgAAeAIAAGgCAAB4AgAAiAIAAHwCAACTAgAAowcAABQIAAD/BgAAuwMAAFQCAABmAgAAZgIAAGMCAACAAgAAlwIAAFgCAABwAgAAdgIAAJIHAACOBwAAPQcAAHUHAACyAwAATQIAAHMCAACWAgAAZgIAAIMCAACWAgAAgAIAAGcCAACoBwAAWQcAAEAHAACJBwAAagcAAPYDAAB5AgAAfAIAAHUCAABaAgAAYwIAAGYCAAB5AgAAjAcAAEwHAABSBwAA1gcAAGUHAACNBwAAvgMAAJQCAABDAgAAeAIAAGQCAAB9AgAAgAIAAI0HAAC7BwAAUgcAAIMHAAAzBwAAZwcAAG8HAADQAwAAnwIAAIUCAABfAgAAbQIAAIgCAABTBwAAUAcAAKsHAAB9BwAAXwcAAIgHAAAMBwAAdwcAAAEEAABrAgAAhgIAAJICAAB7AgAAQQcAAGQHAABeBwAAjAcAAGoHAAAcBwAAkAcAAEgHAABuBwAAyQMAAHMCAACiAgAAkQIAADQHAAB6BwAAyAcAAFYHAABkBwAAHgcAAK8HAACbBwAAIgcAALEHAACDAwAAqAIAAFwCAABTBwAAaQcAACkHAABSBwAAWwcAAIAHAAAmBwAAkAcAAEkHAACtBwAAMAcAAKEDAAB5AgAAmQcAABcHAACdBwAAdQcAAH8HAAB1BwAARAcAAJcHAABJBwAAmwcAAH8HAABCBwAAkwMAAA==",
            "r": "rAMqAyADKgNcA3ADKgP4AjoCxgJOArgBXgHkArYDZgNwA1IDuAGqADwAFAAUAAoAAAAKANACegOYAz4D+AJAAUYACgAAAAAAAAAKAAAAPgNYAqAAZgO8AvAAMgAKAAAAAAAAAAAAAAAqA2QAHgAKANoCBAEUAAAAAAAAAAAAAAAAAHgAAAAAAAAAAACeAoIACgAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAsgI8AAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAFgCHgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAACuARQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvgAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "j": "CgCMAJYAggBQAB4AHgAKAAoAFAAKAAoAAADSABQARgBGABQAAAAAAAAAAAAAAAAAAAAAAOYAKAAeAB4AFAAAAAAAAAAAAAAAAAAAAAAAggAAAAAAWgAUAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAMgAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAEAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "l": "MgAyADIAMgAyACgAHgAeACgAHgAoABQAFAAoAB4AMgAeAFAAHgAKAAAACgAAAAAAAAAAACgAFAAoAFoAUAAeAAoAAAAKAAAAAAAAAAAAFAAKAAoAKABaACgACgAAAAAAAAAAAAAAAAAKAAoAAAAAADwARgAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAA8AB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAUAAoAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAGQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABaAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 210545,
            "raisePct": 13,
            "shovePct": 1,
            "limpPct": 1,
            "rfiPct": 14,
            "completeCells": 169,
            "minimumCellOpportunities": 579
          },
          "MP": {
            "n": "KQMAADMCAAAUAgAAOQIAACkCAAAyAgAAAwIAAP0BAAD3AQAA/QEAAPcBAAAOAgAAAAIAADYGAAD3AgAAHQIAAP8BAAAEAgAAGAIAABMCAAAcAgAADAIAAO0BAAD4AQAAzAEAAPgBAABDBgAALwYAABADAAAgAgAAAAIAAP0BAAAYAgAA+wEAAA0CAAD3AQAAIQIAAAgCAADtAQAAKQYAACYGAAACBgAAAQMAABECAAAFAgAA7QEAAPEBAAD8AQAA3wEAAPYBAAD9AQAAIQIAAAsGAADJBQAA3gUAAB8GAAAVAwAABAIAAA8CAAAAAgAAHAIAAOwBAADYAQAABwIAAPwBAADwBQAAqQUAAN0FAADjBQAA6wUAAPECAAAIAgAACQIAAN4BAADzAQAABwIAAPQBAADzAQAA2wUAABEGAADCBQAAuAUAAKsFAACsBQAA7gIAANwBAAAFAgAA+AEAAAkCAADMAQAA+wEAAO4FAADyBQAAxQUAAP8FAADsBQAAuQUAAMYFAADfAgAA7gEAAOkBAAD0AQAA5wEAAAECAAD5BQAAIQYAAA8GAADBBQAAMQYAAPcFAADeBQAAnQUAABkDAAAOAgAA8gEAAMgBAAD6AQAAvwUAAAsGAAC2BQAAGgYAALAFAAABBgAA0AUAAL4FAADwBQAA2wIAAMoBAADHAQAA6gEAAMMFAAAEBgAA1QUAAKIFAACdBQAAwQUAAKwFAACzBQAAowUAAN8FAAD9AgAA6AEAAL4BAAD5BQAAEQYAAPoFAADABQAA4QUAAOUFAADHBQAAIAYAALsFAACzBQAAAgYAAAgDAAC+AQAAKQYAACQGAAAPBgAA6gUAAOIFAADSBQAAmwUAANkFAADCBQAA6QUAANIFAADXBQAAywIAAA==",
            "r": "tgNSAzQDPgM+A1IDPgMqA9oC+AKyAk4C9AH4ArYDPgM+A1wDbAI2AYwAPAAoAB4AFAAUAMYCcAOsAyoDFgPWAYIAFAAUAAoACgAKAAAAIAPkAmgBZgPQAkABZAAUAAoACgAAAAAAAAA+Aw4BZAA8ABYDhgEyAAoAAAAAAAAAAAAAAEABFAAKAAAAAACoAqAACgAKAAAAAAAAAAAAWgAKAAAAAAAAAAAAYgJ4AAAACgAAAAAAAAAeAAAAAAAAAAAAAAAAAEQCMgAKAAAAAAAAAAoAAAAAAAAAAAAAAAAAAADCAR4AAAAKAAAAFAAAAAAAAAAAAAAAAAAAAAAA8AAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAG4ACgAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAABQAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAA=",
            "j": "CgCCAIwAggBuADwAKAAoABQAHgAUAAoAAADSABQAggBaAEYACgAAAAAAAAAAAAAAAAAAAPoARgAeAFAAKAAAAAoAAAAAAAAAAAAAAAAAqgAUAAoAbgAyAAAACgAAAAAAAAAKAAAAAABaAAAAAAAAALQACgAAAAAAAAAAAAAAAAAAAB4AAAAAAAAAAAAOAQAAAAAAAAAAAAAAAAAACgAAAAAAAAAAAAAAQAEAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAACIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "l": "HgAUACgAHgAyADIAMgAeAB4AMgAKACgAKAAeAB4AHgA8ADIAKAAUABQAAAAKAAoACgAAAB4AFAAeAFAARgAoAAoAAAAAAAAAAAAAAAAAFAAeAAoAFACMADwACgAAAAAAAAAAAAAAAAAKAAoAAAAKAB4ARgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoADIACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 167160,
            "raisePct": 14,
            "shovePct": 2,
            "limpPct": 1,
            "rfiPct": 16,
            "completeCells": 169,
            "minimumCellOpportunities": 446
          },
          "HJ": {
            "n": "dQIAALQBAACfAQAAfAEAAKoBAAC3AQAAmAEAAIcBAACiAQAAfwEAAK0BAABtAQAAiQEAAPAEAAB9AgAAtAEAALgBAACRAQAAhwEAAJkBAABnAQAAnwEAAHUBAACeAQAAhQEAAGwBAADaBAAA3gQAAJACAAB7AQAAegEAAMEBAAChAQAAlQEAAI4BAAB3AQAAcAEAAJcBAACTAQAA2gQAALwEAADSBAAAfgIAAJYBAAB6AQAAbwEAALIBAACJAQAAbgEAAHEBAAB6AQAAhwEAAKoEAACcBAAA0QQAAPsEAABYAgAAogEAAJMBAACaAQAAdgEAAJEBAAByAQAAgQEAAJgBAAC5BAAAmQQAAJQEAACHBAAAuwQAAEcCAAB5AQAAjAEAAIkBAAChAQAAsQEAAHgBAAB2AQAAxwQAAK0EAACBBAAAcwQAAG8EAABPBAAAUQIAAHwBAACEAQAAigEAAJQBAAChAQAAeQEAALsEAABaBAAAigQAAI0EAABtBAAAngQAAGoEAABLAgAAlQEAAH8BAACAAQAAegEAAGkBAACeBAAArQQAALMEAACRBAAAygQAAFEEAAB1BAAATwQAAFQCAACDAQAAgQEAAHQBAAB/AQAAqwQAAIcEAACzBAAAmgQAAN8EAACyBAAAngQAAJsEAAA+BAAAVAIAAH8BAABzAQAAYQEAAJsEAADPBAAAKQQAAHEEAACJBAAArQQAAE0EAABPBAAAYgQAADcEAABFAgAAXwEAAHQBAADWBAAAOgQAAHsEAACGBAAAbQQAANUEAABSBAAAbgQAAJMEAABXBAAAfQQAAB0CAACRAQAA3gQAAFoEAACPBAAAowQAAF0EAABVBAAAiAQAAH8EAABlBAAAgwQAAIMEAACLBAAAeQIAAA==",
            "r": "ygN6AzQDNAMMA0gDNAM0AxYDIAPkAuQCsgLuArYD2gIWA/gC7gISAlQB8AC0AHgARgA8AOQCKgOsA+QCAgNsAl4BeAAoABQAFAAUAAoA5AJSA3YCegOyAhwCIgE8ABQACgAAAAAAAAAgAxwCNgHSABYD9AGMAB4ACgAKAAAAAAAAAGICPAAUAAoAFACyAl4BWgAUAAoACgAAAAAAaAEKAAoAAAAKAAoAgAK+ADIACgAKAAAAAACMAAoAAAAAAAAAAAAAAAgClgAoAAAAAAAAADwACgAAAAAAAAAAAAAAAADMAVoACgAKAAAAUAAAAAAAAAAAAAAAAAAAAAAAQAEoAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAL4ACgAKABQAAAAAAAAAAAAAAAAAAAAAAAAAAACMAAoAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgA=",
            "j": "AABaAIwAlgC0AIIAggBkAEYAWgA8ADIAKADcAAoA3AC0AJYAKAAKAAoACgAKAAAAAAAAAOYAoAAeALQAWgAeAAoAAAAAAAAAAAAAAAoA5gAyABQAUACCAB4ACgAAAAAAAAAAAAAAAACqABQACgAKALQAFAAUAAAAAAAAAAAAAAAAAFoAAAAKAAoAAAAOAQoAAAAKAAAAAAAAAAAAPAAAAAAAAAAAAAAASgEKAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAJoBFAAAAAAAAAAKAAoAAAAAAAAAAAAAAAAAAACQAQAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAAXgEAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAOYAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZAA=",
            "l": "HgAKABQAHgAeABQAHgAeACgAHgAyACgAHgAUAB4AKAAUADwAPAAoABQACgAKAAoACgAAABQAFAAUAEYAZAAyAB4AAAAAAAoAAAAAAAAAFAAUAAoAHgCCAFAAFAAAAAAAAAAKAAAAAAAKAAoACgAKAB4AeAAUAAoAAAAAAAAAAAAAAAoAAAAAAAAAAAAoAGQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAyAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAADIAHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "opportunities": 129713,
            "raisePct": 17,
            "shovePct": 3,
            "limpPct": 1,
            "rfiPct": 21,
            "completeCells": 169,
            "minimumCellOpportunities": 351
          },
          "CO": {
            "n": "+QEAAFUBAAArAQAARAEAADYBAAAsAQAANgEAADwBAAA2AQAAVgEAAGABAABZAQAARwEAAPcDAADnAQAAaAEAADoBAAA4AQAAMAEAAE0BAAA6AQAAOQEAABIBAAAyAQAAJwEAADcBAAD+AwAAsAMAAO8BAAAUAQAATgEAADIBAABNAQAAPgEAAEsBAAAfAQAAMgEAAFUBAAA2AQAA0gMAAJoDAACLAwAA5gEAAEYBAAAoAQAAMAEAADUBAAAaAQAAFgEAADEBAABCAQAAKwEAANoDAACsAwAAlwMAAG8DAAAGAgAAMwEAAD4BAAAyAQAAHAEAABMBAAAnAQAAGgEAABEBAADPAwAAugMAAKgDAACPAwAAKwMAANIBAABsAQAAJwEAAEgBAAAGAQAAJwEAADUBAAA0AQAAzQMAALsDAAC0AwAAlgMAAHoDAABhAwAA1gEAACsBAAAsAQAAPQEAACcBAAA9AQAA9AAAAH8DAACZAwAAfQMAAH0DAAB/AwAAawMAADwDAAC1AQAATAEAACMBAAAhAQAAFwEAABUBAACuAwAAewMAAF0DAACCAwAAYwMAAEwDAABPAwAAgQMAAM8BAAA4AQAAGgEAADoBAAA0AQAAvQMAAHkDAAC1AwAAmwMAAGMDAAA+AwAAjgMAAGUDAABPAwAAtQEAABoBAAAwAQAAFQEAAMYDAAB1AwAAkwMAAJgDAABtAwAAgwMAAFoDAACMAwAAUAMAACQDAAC5AQAAHAEAABYBAAC3AwAAdAMAAJ0DAACJAwAApAMAAFgDAABqAwAAZAMAADEDAAB3AwAAdgMAAJgBAAD/AAAAxAMAAKEDAABxAwAAagMAAF8DAACCAwAAoAMAAGYDAABfAwAAWQMAAFYDAABSAwAA3gEAAA==",
            "r": "wANSA1IDPgP4AtACvALkAsYCqALGArwCxgIgA8oD2gJYAmICFgPaAk4CEgLgAYYBGAHmAOQCqAK2A3YCbALGAkQCVAHIAJYAggB4AFoAvAL4AgIDmANEApQC9AEOAW4AUAAyAB4APACUAuQCYgL+AWYDMAKuAaoAKAAUAB4AFAAKAJQCGAG0AHgAWgACA7gByABGAB4AHgAKAAoAgAJkADwAKAAoADIATgJ8AYIAKAAUAAoACgASAjwACgAUAAoACgAoAOAB+gB4ADIACgAKAF4BHgAKAAoACgAAABQAFAB8AcgAPAAeAAoAmgEUAAoACgAAAAoAAAAKAAoA+gB4ABQAAAAOARQAAAAAAAAAAAAAAAAACgAUANIAFAAKANwACgAKAAAAAAAAAAAAAAAAAAAAAACgAAoAqgAUAAoAAAAKAAAAAAAAAAoAAAAAAAAAjAA=",
            "j": "CgCCAIwAoADcAPoAGAHwANwAIgHSAMgAtAC0AAoA5gCGAUoBggA8AEYAFAAUABQACgAKAPoALAEUADYBGAFuADwACgAUAAoACgAAAAoAIgG+AFoAPAAsAVoAKAAUAAoACgAKAAoACgA2AVAAKAAeAG4AlgAeABQAFAAKAAAAAAAAAA4BFAAKAAoACgDcADwAHgAKAAoACgAAAAAA3AAKAAAACgAKAAAAkAEUABQACgAAAAAAAACWAAAAAAAAAAAAAAAKAOoBHgAUAAAAAAAAAFoAAAAAAAAAAAAAAAAAAAA6AigAAAAKAAAARgAAAAAAAAAAAAAAAAAAAAAAigIeAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAADoCAAAAADIAAAAAAAAAAAAAAAAAAAAAAAAAAADCAQAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVAE=",
            "l": "HgAKAAAACgAKAB4AFAAKAB4ACgAeACgAHgAKABQAHgAKADIAPAAoAB4AFAAUABQACgAUAAoACgAUADIAUABaADwAFAAKAAoAAAAAAAAAAAAUAB4ACgBkAGQAWgAeAAoACgAAAAAAAAAKABQAFAAUABQAjAA8ABQACgAAAAAAAAAAAAoACgAAAAAAAAAKAKoAFAAKAAAAAAAAAAAACgAAAAAAAAAAAAAAAABuABQAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAB4AUAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAB4ACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 100135,
            "raisePct": 23,
            "shovePct": 6,
            "limpPct": 1,
            "rfiPct": 29,
            "completeCells": 169,
            "minimumCellOpportunities": 244
          },
          "BTN": {
            "n": "vQEAACABAAATAQAA9wAAAPgAAAD3AAAA+wAAAAIBAAD0AAAA7gAAAPUAAAD4AAAA7gAAAP0CAACCAQAA6wAAAPEAAADrAAAA+AAAANsAAAD0AAAA7QAAAPkAAADRAAAA7wAAAN0AAAAZAwAA0wIAAIQBAAD3AAAA+wAAAPkAAAD5AAAA9wAAAOkAAADqAAAA3AAAANkAAADiAAAAugIAAAYDAAD3AgAAZQEAAPAAAAD6AAAA6wAAAOwAAADnAAAA8gAAAPcAAAD3AAAA6wAAABwDAADSAgAA4AIAAMcCAAB0AQAA7wAAAPQAAADaAAAA+wAAAO0AAADsAAAA0gAAAN8AAADrAgAAAwMAAN8CAADVAgAArAIAAD8BAADpAAAA2wAAAPcAAAC9AAAA3wAAAOUAAADsAAAADwMAANICAADIAgAAmwIAAGgCAACfAgAATgEAAMwAAADoAAAAygAAANAAAADZAAAAxwAAAPACAACcAgAAnAIAALQCAACtAgAAiQIAAJ0CAABJAQAArwAAAMwAAADHAAAA7AAAAMUAAADuAgAApQIAALwCAACJAgAA2AIAAJcCAACeAgAAhAIAAE0BAADQAAAAyQAAAOUAAADUAAAAxgIAAL8CAAC0AgAAjAIAAJwCAAB3AgAAfwIAAHQCAACVAgAAOQEAAOUAAADdAAAA5gAAAM8CAAC3AgAApgIAANoCAAClAgAApgIAAJsCAAB9AgAAjAIAAIACAAAqAQAAzgAAAMoAAADIAgAAngIAAJkCAACiAgAApgIAAIcCAACeAgAAdwIAAIICAABcAgAAXAIAACcBAADGAAAA5wIAAMICAACOAgAAiAIAAHoCAACQAgAApAIAAIcCAACOAgAAdgIAAIkCAABIAgAAQgEAAA==",
            "r": "wANmA1IDUgMgA9oCbAIwAv4BpAGkAbgB9AE0A9QDqAJOAtYBOgJiAoACngJsAk4CMAISAjQDEgLAA7gBCAIcAqgCsgImAsIB4AGGAUAB5AImAlgCtgN8ATACOgJEAnIBaAFKASwBGAF2AnYCvAKAAnoDCALgAf4BNgHmANIA0gCWANYBngISAuABkAEqA7gBkAFUAQQB0gCMAIIA9AH0AWgBIgHSAAQBxgKkAaQBGAHwAHgAeADgAYYB+gDSAIwAoADIANYBcgEOAb4AoABGAPQBSgGMAGQAUABkAIIAjAByAXIB8ACgAGQA9AHcAG4AWgAoACgAPABuAIwAvgAiAcgAjAD0AfAAZAA8ACgAHgAoADIAPABQAIwA0gCCAMIBqgBkADIAFAAeABQAKAAoAB4AHgB4AFoAwgGWAFAAKAAeACgAFAAUABQAHgAUAAoAggA=",
            "j": "AAB4AIIAggC+AAQBfAGuAcwBHAIcAggCzAGqAAAALAF8AdYBaAEOAeYAlgCgAIwAeABuAKoAwgEeAPQBpAE2AZYAZAA8AEYAMgAyAB4A+gCuAUABKAAmAgQB0gBkADIAFAAUACgAHgBoASwBoACgAGQAQAHIAFoAMgAeABQACgAeAP4BbgA8ACgAPACgABgBbgAoAAoACgAKAAoA1gEyACgAHgAeABQADgHSAEYAKAAoAAoACgDWASgACgAUAAoACgAKAP4BjAA8AB4AAAAUAJABHgAKAAoACgAKAAoAFABiAngAKAAeAAoAhgEeAAAAAAAAAAoAAAAKAAAAAgNQAAoACgBAARQACgAKAAAAAAAAAAAAAAAKADQDHgAKADYBFAAKAAAAAAAAAAAAAAAAAAAAAAD4AgoAGAEKAAoACgAAAAAACgAAAAAAAAAAAAAA0AI=",
            "l": "KAAKAAoACgAKAAoAAAAKABQAFAAoABQAHgAKAAoACgAeADwAMgA8ADwAMgAyAB4AKAAeAAoACgAKADwAMgBuAFoAHgAyADIAKAA8AB4AAAAUACgACgBGAJYAWgAoAB4AFAAUAAoACgAAAB4AMgAoAAoAggCCADIACgAAAAAACgAKAAoAFAAUABQAFAAUAIwAWgAyAAoAAAAKAAoACgAKAAAAAAAKAB4AFAC0AEYAFAAUAAoAAAAKAAoAAAAAAAAACgAKAAoA0gAyAB4ACgAAAAAAAAAAAAAAAAAAAAoAAAAAAG4AMgAKAAoACgAAAAAAAAAAAAAAAAAAAAAAFABaACgAFAAKAAAAAAAAAAAAAAAAAAAACgAAAAAAHgAAAAoAAAAAAAAAAAAAAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgA=",
            "opportunities": 75883,
            "raisePct": 32,
            "shovePct": 12,
            "limpPct": 2,
            "rfiPct": 44,
            "completeCells": 169,
            "minimumCellOpportunities": 175
          },
          "SB": {
            "n": "PwEAALkAAAC2AAAAwAAAANIAAADAAAAAuwAAAMkAAAC6AAAAqwAAAKwAAADIAAAAxQAAAFoCAAAjAQAAtQAAALEAAACxAAAAvgAAALkAAACjAAAApAAAAKoAAACiAAAAuwAAAKwAAABUAgAAPAIAAAkBAAC7AAAArAAAALkAAACrAAAAxQAAAKsAAACbAAAAkQAAAI8AAACEAAAAIwIAACcCAAD+AQAADgEAALMAAAC0AAAAsQAAALcAAACrAAAAsQAAAJgAAACdAAAAngAAADoCAAAuAgAAJgIAABICAABIAQAAmAAAALwAAACxAAAAtAAAALkAAACfAAAAqQAAAK0AAABNAgAA/wEAAAoCAAAHAgAABgIAABsBAACsAAAApAAAAKUAAACtAAAAmQAAAKgAAACkAAAADwIAABECAADXAQAAKAIAAPsBAADIAQAA+gAAAJ8AAACaAAAAkgAAAKMAAACcAAAApwAAADwCAAAUAgAA7QEAAPIBAADtAQAA8AEAANkBAAD9AAAAnAAAAJoAAACIAAAAqgAAAKUAAABFAgAAEAIAAO0BAADlAQAA2AEAALMBAADOAQAA3AEAANQAAACaAAAAlQAAAJ0AAACWAAAATwIAAPwBAADcAQAAyQEAAM0BAADqAQAAxgEAAPQBAADCAQAA0AAAAIsAAACXAAAAgwAAADYCAAAEAgAAywEAAOMBAADqAQAA3wEAAN4BAAC7AQAAsQEAAL4BAAD7AAAAoQAAAJcAAABHAgAA8wEAAOIBAADKAQAA9gEAAJ8BAAC5AQAA7QEAAMsBAAC7AQAAmgEAAOoAAACgAAAADwIAAO4BAADMAQAA8AEAAMoBAACzAQAAyAEAAOMBAAC9AQAAjQEAAL8BAADSAQAA2wAAAA==",
            "r": "JgI6Ak4C/gGaAQ4ByACqAIIAPABQAEYAPADWAVgChgEYAb4AbgBaADwAKABaAIwAMgBaALgB+gCUApYAeABaAFAAZABQAJYAbgCCAKoAQAGqAGQAMAJkADwAZABuAHgAggCWALQAqgD6AG4AggBuABwCWgBQAG4AUACMAL4A8AAYAXgAeACCAJYAZADCAVAAPACMAKAAoADSACwBUACqAKoAyACqAJYAIgEyAFAAbgC+AL4ALAE8AKoA+gDwANIAqgCgAKoAPABuAL4A+gDwADIAqgAOASwBGAHSALQAvgBGAHgAlgCgAPAAMgD6ACIBDgEOAeYA8ADIAMgAHgBkAL4A5gAyAPAANgEiARgByADwAPAA+gAEARQAlgAiAVAABAFKAUAB8ADcANIAyADSAL4A0gAUALQARgAiAUABBAHIAKAAoACgALQA3ACqAL4ACgA=",
            "j": "AADSAOYAIgFoAQgCWAJsArICFgMWAz4DDANeAQoApAHWAToCgAJsAkQCYgIwAsIBOgL0AYYBTgIoAFgCbAIcAv4BzAHCAYYBhgFoASIBCAKeAp4CUACAAnYCHAKGATYB5gDSANIAoACAAqgCMAL+AaoAbAL+AVQBGAHIAG4AggBuAAwDOgJKAUABNgEsATACrgEsAaAAeABkAFoAIAPgAQ4B0gDIAOYA4AESAoYB+gBkAFAAUABSA4YBtACMAFoAbgCMAIoC4AEiAXgAbgBGAFwDcgGWADwAUAAyAEYAeAACA3wBBAGgAIIAZgM2AW4AMgAeACgAKAA8AFAAegNUAXgAUABSAwQBRgA8ABQAHgAUAB4AKAAyAJgDqgBaADQD8ABaADwAFAAAABQACgAUAB4AHgCsA1oAKgPcADwAHgAeABQAAAAKABQACgAKAAoAmAM=",
            "l": "wgHSALQAyADmANIAyADIALQAjACCAGQAoAC0AIYBvgD6AOYA+gAYAV4BXgFKAZABcgGQAaoAlgAsAfAABAFyAZABuAHMAbgB4AHWAeoBoACgANwAXgH6ACIBaAHgARICbAIwAggCYgJuAMgALAFyARgBGAGaAfQBTgIwAmwC9AHWAVoANgH+AfQBHALwAF4B9AH0AU4COgIIApABbgBKAfQBJgIcAjAC3ACQAf4BTgJYAhICuAFaAJAB4AHqARICWAJYArQAuAEwAk4C/gGaAVAAhgF8AXIBcgHWAQgCMAKMANYBCAISAuABUABAAXIBIgH6APoASgHWARICRgAIAk4C1gFaAHIBXgEsAYwAjADIAPoAXgHMATIAMALWAVoASgEYAdwAeAB4AHgAeADSACwBDgEeAP4BZABAAQQB0gBuAFAAWgBQAFAAeACCAFoAPAA=",
            "opportunities": 55254,
            "raisePct": 20,
            "shovePct": 31,
            "limpPct": 31,
            "rfiPct": 51,
            "completeCells": 169,
            "minimumCellOpportunities": 131
          }
        },
        "<15": {
          "EP": {
            "n": "LAUAADsDAAAqAwAARAMAAI0DAABSAwAAIQMAAFYDAAA3AwAAagMAADADAAD2AgAAJAMAABwKAAAwBQAAKAMAADwDAABGAwAAKgMAAC0DAAAIAwAAMwMAACoDAABmAwAAUAMAAD0DAADGCQAAsQkAAMEEAABjAwAAJwMAAF4DAAAeAwAAPwMAAGcDAABvAwAALQMAAEEDAAA8AwAA9gkAAJkJAADbCQAA5QQAAB4DAAASAwAAbwMAAE0DAABIAwAAQQMAAAUDAAAnAwAARwMAAPYJAADfCQAAvAkAALUJAAA8BQAAZQMAADEDAAAdAwAAcwMAACsDAAAqAwAARgMAADUDAACHCQAAYwkAAKgJAAC3CQAAnQkAACIFAABuAwAAMQMAAEsDAAAlAwAAKwMAAC8DAAApAwAAygkAAGUJAABoCQAAxwkAAFoJAABECQAA8QQAACoDAAAIAwAANAMAAAcDAAAtAwAAVAMAAMIJAACTCQAAcQkAAJ8JAACQCQAA3QkAAEkJAAD7BAAAKgMAAB8DAABnAwAASgMAAAcDAACECQAAwwkAAKMJAABfCQAAowkAAEYJAACuCQAAWwkAAP8EAAAzAwAAGAMAAHMDAAANAwAAfwkAAEQJAABOCQAAdAkAANcJAACwCQAAyQkAAJEJAADNCQAA2AQAACcDAAAkAwAAKAMAAD8KAACdCQAAQgkAAHoJAABJCQAAzAkAAO0JAAAvCQAAfgkAAIkJAADGBAAAGQMAABoDAACmCQAAVAkAAHoJAACrCQAAQgkAAK4JAABbCQAAqwkAAHcJAAC3CQAApgkAACwFAABWAwAAsAkAAK8JAAB3CQAA5QkAAOMJAAAACgAA1QkAAJUJAAC8CQAAfQkAAFkJAAAQCgAArAQAAA==",
            "r": "EgLwANIA5gAEASIBNgEEAdwA+gDIAJYAbgCWAP4B+gDwAA4BqgAyACgAFAAKAAoACgAKAIIAQAF8ARgBBAFaABQACgAAAAoAAAAAAAAA0gDwAEYA+gDSAFAACgAAAAAAAAAAAAAAAAAOASgACgAKAJYAPAAKAAAAAAAAAAAAAAAAAEYAAAAKAAAAAACCAB4ACgAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAeAAKAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAG4ACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABGABQAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "j": "aAHaAvgC5AKyAmIC/gGaAUoBhgEYAfoA0gA+A64BvAKeAv4B8AB4AFAAPAA8ADIAKAAeAEgDMAI6AggCkAGWAFAAHgAUABQAFAAUAAoA7gJAAZYA0AKQAYwARgAUABQACgAUAAoACgBYAoIARgAoADQDvgAyABQACgAKAAAACgAKAEoBKAAUABQACgBIA2QAHgAKAAoAAAAKAAAA0gAUAAoACgAKAAoAPgM8ABQACgAAAAAAAACCABQACgAAAAAAAAAKAAIDPAAUAAoAAAAAAFoACgAAAAAAAAAAAAAACgCoAhQACgAKAAAAWgAKAAAAAAAAAAAAAAAAAAAAHAIUAAoAAABGAAoAAAAAAAAAAAAAAAAAAAAAAGgBCgAAADIACgAAAAAAAAAAAAAAAAAAAAAAAAD6AAAAKAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAA=",
            "l": "ZAAUABQACgAeAB4AFAAeABQAHgAeABQAFAAKADIAFAAoACgAHgAKAAoAAAAAAAoAAAAAAAoAFAAeAEYAPAAeAAoAAAAKAAAAAAAAAAoACgAUAAoAFABGABQACgAKAAAAAAAAAAAAAAAKAAoACgAKAAoAHgAAAAAACgAKAAoAAAAAAAAACgAAAAAACgAKABQAAAAAAAAACgAAAAAACgAAAAAACgAAAAAAFAAKAAAACgAKAAAAAAAAAAAAAAAAAAoACgAAABQACgAAAAAAAAAAAAAAAAAKAAoAAAAAAAoAAAAeAAoAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAFAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 272896,
            "raisePct": 4,
            "shovePct": 12,
            "limpPct": 1,
            "rfiPct": 16,
            "completeCells": 169,
            "minimumCellOpportunities": 758
          },
          "MP": {
            "n": "LQQAANgCAADpAgAAvgIAAHwCAAC4AgAAwAIAAM8CAAC0AgAAvAIAAIYCAAC7AgAAnAIAANcHAAARBAAA2wIAALgCAAB9AgAAowIAALgCAACXAgAAkgIAAHgCAACYAgAAiQIAAH0CAAAKCAAAOAgAANcDAACIAgAAogIAAKUCAABxAgAAigIAAGACAACaAgAAogIAALoCAAB5AgAAOggAABcIAAAICAAAEAQAAG4CAACWAgAAdgIAAKACAACOAgAAdwIAAJ0CAACJAgAAugIAAAYIAAC5BwAA4gcAAK8HAAANBAAAigIAAJcCAACXAgAAkgIAAIQCAACDAgAAlAIAAI8CAAAcCAAAtQcAALcHAADCBwAAtAcAANUDAACYAgAAegIAAG0CAAB8AgAAfwIAAIsCAAB6AgAA5QcAAJAHAACGBwAACQgAAEAHAACWBwAAxAMAAK0CAABwAgAAfQIAAGQCAAB2AgAAjgIAAHkHAACXBwAAqAcAAKsHAAB/BwAAWwcAAFwHAADTAwAAkAIAAGoCAACHAgAAiQIAAGUCAAC1BwAAywcAAD8HAACMBwAAYAcAAIoHAABsBwAAdwcAABAEAACLAgAAoAIAAFkCAABzAgAA3QcAAN4HAADFBwAAqgcAAMQHAABHBwAAlQcAAOMHAACXBwAA0AMAAIwCAAB5AgAAgQIAAKgHAAC8BwAAogcAAHsHAACxBwAAjQcAAI4HAACJBwAAkAcAAFgHAAC/AwAAYwIAAGYCAACvBwAAkQcAAK0HAADmBwAAZQcAAKYHAAC4BwAAlwcAAIkHAACNBwAAqwcAAPUDAACcAgAAEQgAAKkHAADSBwAApQcAAHYHAAAoBwAATwcAAH8HAABqBwAAJQcAAIYHAACBBwAAqQMAAA==",
            "r": "OgLcAMgAvgDSAPAA8AD6ANIA8ADSAL4AggCgANYBqgC+APAA5gBaADwAKAAKABQACgAAAIIADgF8AdIA+gCCAB4ACgAAAAoAAAAAAAAAqgAYAXgAIgG+AFoAFAAKAAoAAAAAAAAAAADwAFAAKAAUALQAUAAUAAAAAAAAAAAAAAAAAHgACgAAAAAAAACCACgACgAAAAAAAAAAAAAAMgAKAAAAAAAAAAAAbgAKAAoAAAAAAAAAAAAUAAAAAAAAAAAAAAAAAG4ACgAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAABaAAoAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAKAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAB4AAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAUAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "j": "aAH4AgIDDAP4ArwCgAImAsIB9AGaAXIBIgE0A8wBFgPkAlgCNgG+AHgAUABGAEYAHgAeAEgDigJOApQC6gHSAFAAPAAeABQAFAAUAAoAIAPCAdIAqALqAb4AUAAUABQAAAAKAAoACgCoAsgAZAA8ABYD+gBGABQACgAKAAoACgAAANYBMgAUAAoACgBIA4wAKAAUAAoACgAAAAAANgEUAAoACgAKAAoAXANGABQACgAKAAAAAADcABQAAAAAAAAAAAAAACoDMgAKAAoAAAAAAIwACgAAAAAAAAAAAAAAAAAgAygACgAAAAAAggAKAAAAAAAAAAAAAAAAAAAAlAIUAAAAAABkAAoAAAAAAAAAAAAAAAAAAAAAAOoBCgAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAABUAQAAPAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAA3AA=",
            "l": "PAAKABQACgAKABQAFAAUAB4AHgAUABQAHgAKADwAFAAUACgAKAAKAAoACgAKAAAACgAKAAoAFAAeADIAMgAUAAoAAAAKAAAACgAAAAAACgAKABQAFABGACgACgAKAAAAAAAAAAAAAAAKAAoACgAAABQAHgAKAAAACgAAAAAAAAAAAAoAAAAKAAoACgAKAB4ACgAKAAAAAAAAAAAACgAAAAAACgAAAAAACgAUAAoACgAAAAoAAAAKAAoAAAAAAAAACgAAABQACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAUAAAAAAAKAAAACgAKAAAAAAAAAAAAAAAAAAoACgAAAAoAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAoAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 216928,
            "raisePct": 4,
            "shovePct": 14,
            "limpPct": 1,
            "rfiPct": 18,
            "completeCells": 169,
            "minimumCellOpportunities": 601
          },
          "HJ": {
            "n": "aAMAADcCAAAvAgAAFwIAAEACAAAvAgAAIgIAABwCAAABAgAAGgIAAAsCAAATAgAACwIAAHwGAAAKAwAAMwIAACcCAAAEAgAAGAIAAMMBAADkAQAAIAIAAOEBAADwAQAABAIAAAMCAADYBgAA0QYAADYDAAAcAgAAEAIAAPABAADWAQAAQgIAABUCAADxAQAAEAIAAPsBAAAEAgAAYwYAAFMGAABIBgAAOwMAABMCAAAMAgAA/QEAAOEBAAAiAgAALQIAAB0CAAAOAgAA6AEAAGkGAAAEBgAAMgYAACUGAAAeAwAAIAIAAA8CAAAkAgAA6gEAAPYBAADsAQAA8wEAAOQBAAA0BgAADQYAAAoGAAD+BQAA5wUAABsDAAAOAgAA8gEAAPIBAADWAQAACAIAAP8BAAAJAgAAWwYAANgFAADeBQAALQYAAOYFAADNBQAAKgMAABcCAAANAgAADwIAAO8BAAD2AQAABwIAAAsGAADkBQAAEAYAAO8FAACLBQAA2wUAANoFAADyAgAA9wEAAPcBAAD9AQAA5wEAAPkBAAAyBgAAuQUAAPAFAAAGBgAA7QUAAJIFAACHBQAA6wUAACsDAADkAQAA+QEAAOwBAAAOAgAA4wUAALMFAAAYBgAArgUAAIcFAADIBQAA/wUAAAcGAABWBQAAyQIAAMwBAAAGAgAAwQEAAOEFAAD1BQAA1gUAANUFAADZBQAALQYAAAcGAAALBgAAlwUAAJQFAAAAAwAA/wEAAOsBAAANBgAALQYAAJ0FAACzBQAADQYAAPgFAAC2BQAA0wUAAPIFAACrBQAAxgUAAAQDAAC8AQAARAYAAOEFAADSBQAAIQYAAL4FAAC8BQAAmAUAAPAFAADCBQAAtQUAAIcFAADmBQAACQMAAA==",
            "r": "RAL6ANIAqgCqALQA0gDIANwA5gDcAMgAvgCCABICqgC0AMgA8ACWAHgAPAA8AB4AFAAUAIIAtACkAb4A0gC0AFoACgAKAAoACgAKAAAAeAAOAcgANgG+AJYAPAAUAAoACgAAAAAACgCMAL4AWgAoAMgAWgAyAAoAAAAAAAAAAAAAAKAACgAKAAoAAACWADIAFAAKAAAAAAAAAAAAbgAKAAAAAAAAAAAAWgAoAAoAAAAAAAAAAAA8AAoAAAAAAAAAAAAAAG4AFAAKAAAAAAAAAB4AAAAAAAAAAAAAAAAAAABGAAoAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAARgAKAAoAAAAeAAAAAAAAAAAAAAAAAAAAAAAAADIAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAyAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "j": "VAHaAgwDKgMWAwwD2gLGAmwClAJYAjACzAFSA64BFgP4AtAC1gEsAb4AeABkAFAARgAoAEgDAgMwAuQCdgJUAbQAUAAyACgAHgAUAAoAXANYAl4BngKAAiIBeAAoABQAFAAUAAoAAAA0A0ABtAB4AAwDcgFkAB4AFAAKAAoACgAKAJ4CWgAoAB4AFAA+A7QAMgAKAAoACgAAAAAAOgIoABQACgAKAAoAcANkABQAFAAAAAAAAACGARQACgAKAAoACgAKAFIDWgAKAAoACgAAAA4BFAAKAAAAAAAAAAAACgBcAygACgAKAAoA+gAUAAAAAAAAAAAAAAAAAAoAKgMKAAAAAADIAAoAAAAAAAAAAAAAAAAAAAAAANACCgAAAKoAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAgAAbgAKAAoAAAAAAAAAAAAAAAAAAAAAAAAAfAE=",
            "l": "UAAKAAAACgAUAAoACgAUAAoACgAUABQAHgAKAB4ACgAUAB4AHgAUAAoACgAKAAoAAAAKAAoACgAKACgAKAAyABQACgAKAAAACgAKAAAACgAUABQACgA8AB4AFAAAAAAAAAAAAAAACgAAAAoACgAKAAoAPAAeAAoAAAAAAAAACgAAAAoACgAKAAAACgAKACgACgAKAAAAAAAAAAAAAAAAAAAACgAAAAAACgAeAAoAAAAKAAAAAAAKAAoAAAAAAAAAAAAKAAAACgAAAAAACgAAAAAACgAAAAAACgAAAAAAAAAKABQAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAACgAKAAAAAAAKAAoAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAAAAAACgAAAAAAAAAAAAAAAAAAAAAACgA=",
            "opportunities": 169080,
            "raisePct": 5,
            "shovePct": 17,
            "limpPct": 1,
            "rfiPct": 23,
            "completeCells": 169,
            "minimumCellOpportunities": 444
          },
          "CO": {
            "n": "lwIAAJYBAAC1AQAAyAEAAMcBAACuAQAAtAEAAI0BAACZAQAAgwEAAJ4BAACfAQAAjgEAAPkEAACFAgAAmwEAALUBAACCAQAAjgEAAIUBAACRAQAAggEAAI4BAACMAQAAkwEAAIABAADaBAAAxwQAAIgCAACSAQAAsgEAAJYBAACIAQAAhAEAAIABAACFAQAAcwEAAKcBAAB0AQAAEgUAAMQEAAD0BAAAeQIAAKYBAACfAQAAZgEAAGcBAABXAQAAiwEAAHABAACCAQAAcQEAAOwEAADlBAAAwQQAAIoEAABMAgAAnQEAAHEBAACKAQAAjgEAAHgBAABrAQAAZgEAAH8BAADdBAAAvAQAAK8EAACRBAAAmgQAAC8CAABZAQAAlgEAAHwBAAB4AQAAhwEAAJEBAACYAQAA4QQAAIsEAAC2BAAApwQAAHYEAAAtBAAAWAIAAFoBAAB7AQAAdQEAAHQBAACaAQAAcAEAABcFAACLBAAAlwQAALgEAACUBAAAgAQAAGcEAAA9AgAAeQEAAGYBAABNAQAAXwEAAHIBAAAoBQAAYAQAAGIEAAAwBAAAkQQAACwEAABOBAAAUgQAAFMCAAB0AQAAXwEAAGEBAAB4AQAAxgQAAIkEAABiBAAA1wQAAGMEAABiBAAAWgQAAGMEAAA3BAAAQgIAAHMBAACIAQAATAEAAO0EAABlBAAAbAQAAGIEAACKBAAARQQAAFEEAAB1BAAAdwQAAGYEAAA0AgAAbwEAAHQBAACVBAAAkAQAAGAEAACTBAAAgwQAAIAEAABWBAAANgQAAC8EAAAwBAAAHQQAAA0CAABzAQAAcAQAAJsEAACZBAAAcwQAANkEAAA2BAAATAQAAGAEAACEBAAAJgQAAB8EAABSBAAAFwIAAA==",
            "r": "WAL6ANwAyAC0AJYAggCWAIIAeACCAKAAlgC0ACYCjACMAG4A5gC+ANIAoACCAFoARgBQAIwAggDCAXgAjACqAKAAWgAyAEYAKAAUABQAeACqANwAXgGCAIwAbgBGAB4AFAAAAAAAAABkAMgAvgBuANwAggBkAB4ACgAKAAoACgAKAG4AUAAoAB4AFAC+AGQAPAAKABQACgAAAAoAeAAeAAoACgAKABQAeABGABQAHgAKAAAAAABuAAoACgAKAAoAAAAKAFAAMgAKAAoAAAAAAFoACgAKAAAAAAAKAAoAAAAoACgACgAAAAAAZAAKAAAAAAAAAAAAAAAAAAoAPAAUAAoAAABaAAoAAAAAAAAAAAAAAAAAAAAAADIACgAAADwACgAAAAoAAAAAAAAAAAAAAAAAAAAyAAAAMgAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAA=",
            "j": "NgHkAvgCDAMgAzQDSAMgAyADNAMWA9oC0AIqA5ABSANIA0gDqAIcApABIgHwANIAggCWAD4DSAMSAioDDAM6Al4BlgBuAGQARgAyAB4AZgP4AjACgAICA+oB+gCCACgAHgAeABQAFABmA0QCVAEEAe4COgLIADwAHgAUAAoAFAAUAD4D8ABkADwAMgAMAzYBZAAoAAoACgAAAAoAFgNkACgAHgAKAAoAXAPwADwACgAUAAoACgC8AkYACgAKAAoACgAKAGYDqgAoAAoAFAAKADACKAAKAAoAAAAAAAAACgCYA24AFAAUAAoAOgIeAAoAAAAAAAAAAAAAAAAAcAMyAAoAAAC4ARQAAAAAAAAAAAAAAAAACgAAAGYDCgAAAHwBFAAKAAAAAAAAAAAAAAAAAAAAAADaAgoAXgEKAAoAAAAAAAAAAAAAAAAAAAAAAAAAdgI=",
            "l": "UAAKAAoACgAKAAoACgAKAAoAAAAKAAoAFAAAACgACgAAAAoAFAAKABQAFAAUAAAAFAAKAAoAAAAUABQAFAAyAB4ACgAAAAoACgAKAAAAAAAKABQAAAAeAB4AKAAKAAAACgAAAAoAAAAAABQAFAAUABQAKAAeABQAAAAKAAAACgAAAAoACgAKAAAAAAAUACgAHgAAAAAACgAAAAAAAAAAAAoAAAAAAAAAAAAeAAoAAAAAAAAAAAAKAAoAAAAAAAAAAAAKAAoAHgAUAAAAAAAAAAoAAAAKAAAACgAAAAAAAAAKAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAACgAKAAoAAAAKAAAACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAKAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 128371,
            "raisePct": 6,
            "shovePct": 23,
            "limpPct": 1,
            "rfiPct": 29,
            "completeCells": 169,
            "minimumCellOpportunities": 332
          },
          "BTN": {
            "n": "NQIAAFEBAABWAQAAUAEAAFEBAABJAQAASQEAADEBAABYAQAAOAEAAEwBAAA7AQAARgEAABsEAAAAAgAAPAEAAGUBAAA4AQAAJgEAADMBAAAlAQAAJwEAACQBAAArAQAAGAEAACMBAAC8AwAAzwMAALkBAABMAQAAMAEAADABAAA2AQAAUgEAAB0BAAAgAQAAJAEAACQBAAArAQAA9wMAALQDAABvAwAA5QEAACcBAAAmAQAAFAEAABUBAAAmAQAAJgEAADUBAAArAQAAHAEAADEEAACoAwAAjAMAAHsDAADKAQAAFAEAACwBAAApAQAALAEAADkBAAAeAQAABAEAABwBAADPAwAAsgMAAHADAACiAwAAfAMAALUBAAAgAQAAFgEAABUBAAD/AAAAJQEAABkBAAASAQAA5AMAAJQDAABtAwAAXAMAAEQDAABnAwAAtAEAAP8AAAADAQAAJgEAABwBAAAXAQAAFAEAALsDAAB+AwAATQMAAG8DAAAzAwAAKgMAAGUDAACXAQAABQEAABoBAAATAQAABQEAABsBAADDAwAAXwMAAJIDAABiAwAANQMAAEIDAABRAwAAIQMAAL0BAAAeAQAABAEAACQBAAAaAQAAoAMAAGwDAABgAwAAYQMAAHUDAAAmAwAATQMAACgDAAAiAwAArAEAACIBAAAcAQAAEwEAAJ0DAACGAwAAVAMAAGADAAAnAwAAWAMAAFMDAAA9AwAAFwMAAAsDAACiAQAAAwEAAAABAADWAwAAggMAAGADAAA2AwAAVgMAAD0DAAB5AwAAFQMAAF8DAAApAwAAGQMAAJQBAAAMAQAAjwMAAKADAACNAwAAIgMAAJQDAAAoAwAAFAMAAHUDAABFAwAAHQMAAAoDAAD7AgAArQEAAA==",
            "r": "WAJoARgBGAHIAKAAeABQAG4ARgBQAHgAeADmAGICqgCWAG4AeACWAJYAtACgAIwAqgCMANIAeAA6Am4AWgCMALQAlgC0AIIAZABaAFAAtABaAIwAzAFkAJYAlgCqADIAjABaAFoAMgCCAIIAqgCqAGgBWgB4AFAAWgA8ACgAMgBGAFAAtACgAGQAUAD6AHgAeAA8AFAAMgAeAB4AUACCAGQAPAA8AEYAtABaAGQAMgAoACgAKABQAGQAMgAoAB4AKAAyAJYAUAA8AFoAHgAeAFAAWgAyACgAHgAeAB4AKABaADwARgAyAB4AWgBkAB4AKAAUABQAFAAUABQAUABQADwAHgBQADwAHgAUAAoACgAKABQAFAAeACgAKAAoAFoAPAAoABQACgAKAAoACgAKAAoAFAAoACgAUAAyABQAFAAKAAoAFAAKABQACgAKAAoAKAA=",
            "j": "GAF2ArwCxgIMAzQDXANmA0gDegN6A0gDSAP4AkoBIANIA1IDSAPkAqgCTgImAuABkAFeAQwDUgOQAWYDZgPuAnYChgEEAfAA3ADcAIIAIANwAwwD/gE+A6gCHAIYAZYAeACgAIwAZABIAyADdgL0AXYCxgLWAeYAbgBGAFAAPAAeAHoDJgIiAcgAqgDaAhwCGAF4AFAAHgAyADwAZgNyAbQAggBQAFAAKgOQAcgAWgA8AB4AHgBmAw4BWgBGACgAKABGAEgDXgFkADwAFAAUAD4DtAAyACgAFAAeACgAKAB6A/AARgBGACgASAOCACgAFAAKAAoAFAAUAB4AZgOWADwAKAAqA3gAKAAUAAoACgAKAAoAFAAKAJgDMgAeAOQCZAAeABQAAAAKAAoACgAKAAoAFAB6AzIAxgJGACgAFAAKAAoAAAAAAAAAAAAKAAAAKgM=",
            "l": "bgAAAAoAAAAAAAoACgAKAAoACgAAAAoAAAAAADwACgAAAAoACgAeACgAHgAoAAoAHgAUAAAACgAeAAAAFAAyAB4AMgAUAB4ACgAUABQACgAKABQAFAAUADwAMgAUABQACgAKAAoAAAAKAAoAFAAeAAAAPABGADwAHgAKAAoACgAAAAAACgAKABQACgAKADwAMgAUAAoACgAAAAAAAAAKAAAACgAKAAAAAABGAB4AFAAKAAAAAAAAAAAAAAAAAAoACgAKAAAAPAAeABQAAAAAAAAAAAAAAAAAAAAAAAAACgAAAB4AFAAUAAAAAAAAAAAAAAAAAAAACgAKAAAAAAAUAAoACgAAAAAACgAAAAAAAAAAAAAAAAAKAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAoACgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "opportunities": 97076,
            "raisePct": 9,
            "shovePct": 31,
            "limpPct": 1,
            "rfiPct": 40,
            "completeCells": 169,
            "minimumCellOpportunities": 255
          },
          "SB": {
            "n": "8QEAABIBAAAfAQAAJgEAACcBAAAGAQAAFAEAAC0BAAAZAQAADgEAAAoBAAAHAQAA/gAAAHIDAACrAQAAEAEAAPwAAAAdAQAAHAEAAA8BAAD9AAAAEgEAABMBAAD2AAAA8gAAACsBAAChAwAALAMAALQBAADoAAAA9AAAABIBAADrAAAADAEAAO8AAAD3AAAA5QAAAPsAAADyAAAAcwMAAEYDAAA2AwAAkwEAAPIAAADtAAAABAEAAOcAAAAPAQAA1wAAAOQAAADrAAAA+QAAAHgDAAA1AwAAOAMAACgDAACfAQAA7wAAAAYBAAABAQAA+AAAAPIAAAD9AAAA/QAAAPUAAABHAwAAIgMAAC8DAAA1AwAA2gIAAGMBAADxAAAA2gAAAAUBAADyAAAA1gAAAPQAAADiAAAAfAMAAP4CAADSAgAA1QIAAAwDAADMAgAAfwEAAAMBAADaAAAA8wAAANAAAADZAAAA6QAAAHIDAADpAgAA/QIAAAsDAAAGAwAAxgIAAN4CAACOAQAA/AAAAAMBAADhAAAA9wAAAOAAAAAyAwAABAMAAPYCAADxAgAAtAIAANYCAADrAgAA5gIAADwBAADaAAAA6QAAAOYAAADmAAAAZAMAAAUDAAAMAwAA4AIAANQCAACtAgAAtQIAALgCAADfAgAARwEAAN4AAADTAAAA7gAAAF0DAAD8AgAA0QIAAM8CAAC7AgAAugIAANsCAADWAgAAvQIAAJkCAABpAQAA8wAAANYAAABaAwAAxQIAAMECAADMAgAA+gIAAN0CAACUAgAApwIAAKsCAACPAgAAkQIAAEUBAADvAAAAPwMAAAUDAADjAgAA5wIAAKECAACwAgAApQIAAG0CAAB8AgAAyQIAAIgCAAC+AgAAXAEAAA==",
            "r": "QAEEAdIAqgCCADwAMgAoAB4AMgAyABQAFACMADYBjABkAGQAPAAeADIAFAAKACgAFAAeAHgAUABAASgAHgAeAB4AMgAUACgAFAAoADIAWgAyAB4AGAEoADIAKAAoAB4AMgAoADIAMgAyACgAKAAoAPoAHgAeACgAHgAyADwARgBGACgAKAAyACgAKACMAAoAKAAyADwAPAA8AFAAHgAoACgAKAAoACgAZAAeAB4ARgAyAIIAMgAeADIAPAA8ADIAMgAeAFAAFAAoACgAHgAoAB4AMgBGAGQAUABGAEYAMgAyADwAHgBQAFAAKAAyAEYAZABaAGQAWgBaADwAHgA8ADwAPAAeACgARgBaAGQAbgBuAFoAWgBGABQAMgA8AB4APABaAGQAbgBuAFAAWgBkAFAAWgAUAFAAHgA8AGQAeABaAG4AWgBQAGQAZABQAFAAFAA=",
            "j": "ggBiAooC+AIMA3ADUgOOA6IDjgOOA6IDtgMgA7QADAMqA1wDhAOiA3oDogOOA3oDhANcAzQDcAMOAY4DmAOiA4QDcAMWAwIDSAMWA8YCXAOOA6IDuAGiA2YDcAPuAtoCngKoAmICMAKOA6IDegN6AyYChAM+A6gCbALgAYYB1gFoAawDhAM+A/gCsgLuAlwDxgJEAsIBpAEsAQ4BtgNwAwIDngImAjoCPgMCA9oC6gHMASIBaAHAA2YDigIIApABmgHCAXoDxgISApoBaAFAAbYDNANOAl4BLAEYAVQBhgGYA4oC1gGkAUABrAMqA/4BNgHcANwA3AAOASwBrANYAlQBNgGsAwID6gFAAb4AlgCWALQAyAD6AKIDkAEOAawD+AKuAfoAoAB4AGQAjACMAJYAlgDKAxgBrAPQAq4B8ACWAG4AZACCAG4AbgB4AGQArAM=",
            "l": "HAKCAIwARgBGADIAUAAyACgAHgAeABQACgAyAP4BUABQAB4AKAAeADIAFAA8ADIAMgBQADIAHgCQATIAHgAoADIARgCMAKAAWgBuAKoAMgAeAB4AGAEUADwAPACWAKoAoAC0ANIA+gAeABQAMgAyAMgAMgBkAL4A8AAYAUoB3ADcABQAKABaAIwAqgBkAFoAlgDmAEAB+gD6ANwAFAAyAIIAtADwANwAPACWAKAA3AAYAb4A0gAAACgAlgDSAPoA+gAEAR4AtADwAF4BIgHIAAoAPACWAMgAvgDmAPAABAEUANIANgH6ANIAAABGAJYAoABuAHgAoADmABgBCgDwAF4BIgEKAGQAggCWAHgAUABuAKoA0gD6ABQALAEOAQoAPACWAHgARgBGAFoAZAB4AKoAqgAAAAQBCgA8AIIAeABQADIAPAA8AGQAUABQAFAACgA=",
            "opportunities": 83152,
            "raisePct": 7,
            "shovePct": 58,
            "limpPct": 12,
            "rfiPct": 65,
            "completeCells": 169,
            "minimumCellOpportunities": 208
          }
        }
      }
    }
  }
};
})();
