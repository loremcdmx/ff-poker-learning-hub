(function () {
  "use strict";

  const FULL_HISTORY_FIELD = /* FF_FULL_HISTORY_FIELD_START */ {
  "schemaVersion": 1,
  "meta": {
    "source": "analytics.int_tracker_hand_joined",
    "sourceLabel": "FF ClickHouse · exact latest-first field cube",
    "periodLabel": "01.09.2023–22.07.2026",
    "windowStartInclusive": "2023-09-01",
    "windowEndExclusive": "2026-07-22",
    "windowSemantics": "half_open_utc",
    "rankTiming": "exact_as_of_hand",
    "rankBridge": "half_open_intervals",
    "latestKey": "hand_player_id",
    "latestOrder": "version_then_complete_projected_tuple",
    "minimumDenominator": 50,
    "cohortBands": {
      "league1": [
        1,
        5
      ],
      "league2": [
        6,
        10
      ],
      "league3": [
        11,
        14
      ],
      "novice": [
        15,
        18
      ]
    },
    "shardManifest": {
      "name": "full-history-shard-manifest.json",
      "sha256": "837cc3b61746f61c10bc216f08b29122a4e013358737b83287b49b8daa44c726",
      "strategy": "six_month_time_windows_x_contiguous_user_partitions",
      "continuous": true,
      "shardCount": 20,
      "userPartitionPolicy": "sorted_user_offsets_exact_once",
      "windowPartitions": [
        {
          "from": "2023-09-01",
          "to": "2024-03-01",
          "eligibleUsers": 1179,
          "partitionCount": 3,
          "partitions": [
            {
              "id": "2023-09-01_2024-03-01_u1of4",
              "index": 0,
              "count": 4,
              "startOffset": 0,
              "endOffsetExclusive": 294,
              "eligibleUsers": 1179,
              "selectedUsers": 294,
              "selectedUserIdsSha256": "4ddf7fde2314b156582e2c13c53b9a8e98902a7b1bff4460b1b6d8b92e6f27ab"
            },
            {
              "id": "2023-09-01_2024-03-01_u2of4",
              "index": 1,
              "count": 4,
              "startOffset": 294,
              "endOffsetExclusive": 589,
              "eligibleUsers": 1179,
              "selectedUsers": 295,
              "selectedUserIdsSha256": "73744425bf7634c1bd7e3b6f06efa882edd1edea2df0bf1d89320576ddf62be7"
            },
            {
              "id": "2023-09-01_2024-03-01_u2of2",
              "index": 1,
              "count": 2,
              "startOffset": 589,
              "endOffsetExclusive": 1179,
              "eligibleUsers": 1179,
              "selectedUsers": 590,
              "selectedUserIdsSha256": "438aa5569f3add8ae700cc3b97f89d042bd62cc379d551920b2d245dac0dfd6f"
            }
          ]
        },
        {
          "from": "2024-03-01",
          "to": "2024-09-01",
          "eligibleUsers": 1180,
          "partitionCount": 3,
          "partitions": [
            {
              "id": "2024-03-01_2024-09-01_u1of4",
              "index": 0,
              "count": 4,
              "startOffset": 0,
              "endOffsetExclusive": 295,
              "eligibleUsers": 1180,
              "selectedUsers": 295,
              "selectedUserIdsSha256": "6aa36e80ca6596af088a91d919dba28168309ebda0b727dfdf7e277bdcfe2346"
            },
            {
              "id": "2024-03-01_2024-09-01_u2of4",
              "index": 1,
              "count": 4,
              "startOffset": 295,
              "endOffsetExclusive": 590,
              "eligibleUsers": 1180,
              "selectedUsers": 295,
              "selectedUserIdsSha256": "7cf83f1743615f5a680885fb27f465ff464bbdc272572e09e7d8f79742f707ab"
            },
            {
              "id": "2024-03-01_2024-09-01_u2of2",
              "index": 1,
              "count": 2,
              "startOffset": 590,
              "endOffsetExclusive": 1180,
              "eligibleUsers": 1180,
              "selectedUsers": 590,
              "selectedUserIdsSha256": "931f81c29e69eb2ed0b38cecb659670a80030f5a3ed17c003dec21a20b629fda"
            }
          ]
        },
        {
          "from": "2024-09-01",
          "to": "2025-03-01",
          "eligibleUsers": 1457,
          "partitionCount": 4,
          "partitions": [
            {
              "id": "2024-09-01_2025-03-01_u1of8",
              "index": 0,
              "count": 8,
              "startOffset": 0,
              "endOffsetExclusive": 182,
              "eligibleUsers": 1457,
              "selectedUsers": 182,
              "selectedUserIdsSha256": "b881fa86c755f562eb38dc83b0d843de5e71784ea3bcfad50c230173bd565890"
            },
            {
              "id": "2024-09-01_2025-03-01_u2of8",
              "index": 1,
              "count": 8,
              "startOffset": 182,
              "endOffsetExclusive": 364,
              "eligibleUsers": 1457,
              "selectedUsers": 182,
              "selectedUserIdsSha256": "83162b251fea847190e4561fdddd53f76a7c1e1d2f2d8a2435432237893e5b51"
            },
            {
              "id": "2024-09-01_2025-03-01_u2of4",
              "index": 1,
              "count": 4,
              "startOffset": 364,
              "endOffsetExclusive": 728,
              "eligibleUsers": 1457,
              "selectedUsers": 364,
              "selectedUserIdsSha256": "0eaacf06e2c4e4f27151577c1a665bf14cd59c926850dc50a57c9c47b99f2001"
            },
            {
              "id": "2024-09-01_2025-03-01_u2of2",
              "index": 1,
              "count": 2,
              "startOffset": 728,
              "endOffsetExclusive": 1457,
              "eligibleUsers": 1457,
              "selectedUsers": 729,
              "selectedUserIdsSha256": "9defe9af0d7be3db47c302edebb96850e2c8d43bf2a0187dbf45578f13ef0997"
            }
          ]
        },
        {
          "from": "2025-03-01",
          "to": "2025-09-01",
          "eligibleUsers": 1887,
          "partitionCount": 3,
          "partitions": [
            {
              "id": "2025-03-01_2025-09-01_u1of4",
              "index": 0,
              "count": 4,
              "startOffset": 0,
              "endOffsetExclusive": 471,
              "eligibleUsers": 1887,
              "selectedUsers": 471,
              "selectedUserIdsSha256": "0b789ad3bb8ffe8c04bad4fcb972a54d4d3688d1b7994bafb8debe01270d342c"
            },
            {
              "id": "2025-03-01_2025-09-01_u2of4",
              "index": 1,
              "count": 4,
              "startOffset": 471,
              "endOffsetExclusive": 943,
              "eligibleUsers": 1887,
              "selectedUsers": 472,
              "selectedUserIdsSha256": "900b90142f30128b0e166e7bba1fd2327045b8b9fe7800eeb9ffdb3ff24e7cc1"
            },
            {
              "id": "2025-03-01_2025-09-01_u2of2",
              "index": 1,
              "count": 2,
              "startOffset": 943,
              "endOffsetExclusive": 1887,
              "eligibleUsers": 1887,
              "selectedUsers": 944,
              "selectedUserIdsSha256": "a30e3e07831fa0ba0ef832b6649eec19dc380f5a47bcb20d62107e593f914b62"
            }
          ]
        },
        {
          "from": "2025-09-01",
          "to": "2026-03-01",
          "eligibleUsers": 2213,
          "partitionCount": 4,
          "partitions": [
            {
              "id": "2025-09-01_2026-03-01_u1of4",
              "index": 0,
              "count": 4,
              "startOffset": 0,
              "endOffsetExclusive": 553,
              "eligibleUsers": 2213,
              "selectedUsers": 553,
              "selectedUserIdsSha256": "6a89975dcaaa98b95ee01447781a04d1605ea478910ff9ef3000a85b7eda6975"
            },
            {
              "id": "2025-09-01_2026-03-01_u2of4",
              "index": 1,
              "count": 4,
              "startOffset": 553,
              "endOffsetExclusive": 1106,
              "eligibleUsers": 2213,
              "selectedUsers": 553,
              "selectedUserIdsSha256": "6e5552d8d4e04dc820ee7bc8af9faf8936c9ffbd3b9d69be5969395e541040d0"
            },
            {
              "id": "2025-09-01_2026-03-01_u3of4",
              "index": 2,
              "count": 4,
              "startOffset": 1106,
              "endOffsetExclusive": 1659,
              "eligibleUsers": 2213,
              "selectedUsers": 553,
              "selectedUserIdsSha256": "ae0476dad9adfeace3e2a070d76fb1457b281c86eecc1d5fc42afe700fdad377"
            },
            {
              "id": "2025-09-01_2026-03-01_u4of4",
              "index": 3,
              "count": 4,
              "startOffset": 1659,
              "endOffsetExclusive": 2213,
              "eligibleUsers": 2213,
              "selectedUsers": 554,
              "selectedUserIdsSha256": "8927367ea6d63bf9e6d56e071bf52d47c386fef0a7ff10cc993602ddec50b15a"
            }
          ]
        },
        {
          "from": "2026-03-01",
          "to": "2026-07-22",
          "eligibleUsers": 2341,
          "partitionCount": 3,
          "partitions": [
            {
              "id": "2026-03-01_2026-07-22_u1of4",
              "index": 0,
              "count": 4,
              "startOffset": 0,
              "endOffsetExclusive": 585,
              "eligibleUsers": 2341,
              "selectedUsers": 585,
              "selectedUserIdsSha256": "b9f92273ae05fb56125a22e2838cbc415f20091164883d9921ed51c49cd90d59"
            },
            {
              "id": "2026-03-01_2026-07-22_u2of4",
              "index": 1,
              "count": 4,
              "startOffset": 585,
              "endOffsetExclusive": 1170,
              "eligibleUsers": 2341,
              "selectedUsers": 585,
              "selectedUserIdsSha256": "10bf1045f9d5d7e89dd760960a49c21368a0a39aa0232098350062c2d3d4d59b"
            },
            {
              "id": "2026-03-01_2026-07-22_u2of2",
              "index": 1,
              "count": 2,
              "startOffset": 1170,
              "endOffsetExclusive": 2341,
              "eligibleUsers": 2341,
              "selectedUsers": 1171,
              "selectedUserIdsSha256": "316af8afd9b85dae15e137cc23ffa15ae976840276b068bcf1184b3dc9ef4bff"
            }
          ]
        }
      ],
      "sourceQueryTemplateSha256": "df9f14a6140cb82d16cd568eafb512fbbb97f9a111c655df6bbb7e5ae81dccfe",
      "rankSource": {
        "name": "vs3bet-rank-intervals-full-history-exact-20260722.csv",
        "metadataName": "vs3bet-rank-intervals-full-history-exact-20260722.csv.meta.json",
        "metadataSha256": "1f3ec53a86829b6d6a5984478e07ad6cb0889b43557a4f1a5d2bddc8f3b2d3c9",
        "sourceQueryTemplateSha256": "622ecd00f28bba7baccc02de4cd4b2d46fe24e59d88e4bb2a1c488d20b28daaf",
        "executionMode": "async",
        "queryJobId": "mcp_bq_job_e9147a172e0a455faa21292b7aa80a4d",
        "querySha256": "622ecd00f28bba7baccc02de4cd4b2d46fe24e59d88e4bb2a1c488d20b28daaf",
        "resultSha256": "64b309058fabffe1d2f25e4a7d68f4aae84867d96a3faa9a743c4b0c39f78cd6",
        "rowCount": 19699,
        "window": {
          "startInclusive": "2023-09-01",
          "endExclusive": "2026-07-22"
        }
      },
      "executions": [
        {
          "id": "2023-09-01_2024-03-01_u1of4",
          "window": {
            "startInclusive": "2023-09-01",
            "endExclusive": "2024-03-01"
          },
          "userShard": {
            "index": 0,
            "count": 4,
            "startOffset": 0,
            "endOffsetExclusive": 294,
            "eligibleUsers": 1179,
            "selectedUserIdsSha256": "4ddf7fde2314b156582e2c13c53b9a8e98902a7b1bff4460b1b6d8b92e6f27ab"
          },
          "queryJobId": "mcp_ch_job_3f1703257bb149059e3d2497b564a9cb",
          "executionMode": "async",
          "querySha256": "af92f8fe2af10a124ca584866e2b861c281b2bbeec81e7ed66c1748d31a763d5",
          "resultSha256": "a0f5bcda4ee0c1ce793768f4eac96d337d819dd623413256f9d83ec6abb1f92a",
          "rowCount": 99
        },
        {
          "id": "2023-09-01_2024-03-01_u2of4",
          "window": {
            "startInclusive": "2023-09-01",
            "endExclusive": "2024-03-01"
          },
          "userShard": {
            "index": 1,
            "count": 4,
            "startOffset": 294,
            "endOffsetExclusive": 589,
            "eligibleUsers": 1179,
            "selectedUserIdsSha256": "73744425bf7634c1bd7e3b6f06efa882edd1edea2df0bf1d89320576ddf62be7"
          },
          "queryJobId": "mcp_ch_job_01395c16156643c6a2500d7591429c2e",
          "executionMode": "async",
          "querySha256": "d074af340a97ef0c6f0c5a52d0ea2be7fa4420acffe2b5d91c6d8faf3b42d209",
          "resultSha256": "2a1bb955dae4b2016b6550626a1de212a8b2b5cd6cd34355604b1b775bc0c412",
          "rowCount": 132
        },
        {
          "id": "2023-09-01_2024-03-01_u2of2",
          "window": {
            "startInclusive": "2023-09-01",
            "endExclusive": "2024-03-01"
          },
          "userShard": {
            "index": 1,
            "count": 2,
            "startOffset": 589,
            "endOffsetExclusive": 1179,
            "eligibleUsers": 1179,
            "selectedUserIdsSha256": "438aa5569f3add8ae700cc3b97f89d042bd62cc379d551920b2d245dac0dfd6f"
          },
          "queryJobId": "mcp_ch_job_358b47f9d04b456e8c776f3eb1c87512",
          "executionMode": "async",
          "querySha256": "45f030268d64f8663ac253667f8a110d3b1f6a2e3cf9fb93e7f4f780e59bbf19",
          "resultSha256": "c3b4584417aee92daa0565c550c70be8810293618e3ab9614038c8c6f5332824",
          "rowCount": 132
        },
        {
          "id": "2024-03-01_2024-09-01_u1of4",
          "window": {
            "startInclusive": "2024-03-01",
            "endExclusive": "2024-09-01"
          },
          "userShard": {
            "index": 0,
            "count": 4,
            "startOffset": 0,
            "endOffsetExclusive": 295,
            "eligibleUsers": 1180,
            "selectedUserIdsSha256": "6aa36e80ca6596af088a91d919dba28168309ebda0b727dfdf7e277bdcfe2346"
          },
          "queryJobId": "mcp_ch_job_b02d20d426ef4aad83db645ed4ee1d72",
          "executionMode": "async",
          "querySha256": "1f4f6f39921041961394ef9045d9c4eb6e744ceee6035c75d16a2243c21c0581",
          "resultSha256": "4f6d19d0af1cbf44b12743b87798cec22ee33b796466641256832e2b20cc4f02",
          "rowCount": 132
        },
        {
          "id": "2024-03-01_2024-09-01_u2of4",
          "window": {
            "startInclusive": "2024-03-01",
            "endExclusive": "2024-09-01"
          },
          "userShard": {
            "index": 1,
            "count": 4,
            "startOffset": 295,
            "endOffsetExclusive": 590,
            "eligibleUsers": 1180,
            "selectedUserIdsSha256": "7cf83f1743615f5a680885fb27f465ff464bbdc272572e09e7d8f79742f707ab"
          },
          "queryJobId": "mcp_ch_job_48fd76f1ec4f4fd2bcffb0335471464f",
          "executionMode": "async",
          "querySha256": "d840fb0a5dd21f970552eff46c1f71a3f4a0f8d60985f56fe85030fb33285ca2",
          "resultSha256": "46dde66dcb93e4a1a4c803d204fedc06fa5651ddb59f0bb5e3d7611390a1a623",
          "rowCount": 132
        },
        {
          "id": "2024-03-01_2024-09-01_u2of2",
          "window": {
            "startInclusive": "2024-03-01",
            "endExclusive": "2024-09-01"
          },
          "userShard": {
            "index": 1,
            "count": 2,
            "startOffset": 590,
            "endOffsetExclusive": 1180,
            "eligibleUsers": 1180,
            "selectedUserIdsSha256": "931f81c29e69eb2ed0b38cecb659670a80030f5a3ed17c003dec21a20b629fda"
          },
          "queryJobId": "mcp_ch_job_b9361a702ee94d7f849862213051d6bf",
          "executionMode": "async",
          "querySha256": "efbb72f7ad77bf7ed056a3471801e84bfacb2e707599db5779aebd9034790901",
          "resultSha256": "f2c70508c18e44ac98ec27a789431e0378b58be2aecdcf0468118eb5d4997f7e",
          "rowCount": 132
        },
        {
          "id": "2024-09-01_2025-03-01_u1of8",
          "window": {
            "startInclusive": "2024-09-01",
            "endExclusive": "2025-03-01"
          },
          "userShard": {
            "index": 0,
            "count": 8,
            "startOffset": 0,
            "endOffsetExclusive": 182,
            "eligibleUsers": 1457,
            "selectedUserIdsSha256": "b881fa86c755f562eb38dc83b0d843de5e71784ea3bcfad50c230173bd565890"
          },
          "queryJobId": "mcp_ch_job_e7ec1216ee854636abbdc2d2bc3ced9a",
          "executionMode": "async",
          "querySha256": "39abbdd22004cfaa17124ccecaeacae2420b42003317154d596264abbeefd73e",
          "resultSha256": "2c30e99fafe00e16da3ba68f6593aa2935a889b2655b7c7f243f6d68b16c2c08",
          "rowCount": 99
        },
        {
          "id": "2024-09-01_2025-03-01_u2of8",
          "window": {
            "startInclusive": "2024-09-01",
            "endExclusive": "2025-03-01"
          },
          "userShard": {
            "index": 1,
            "count": 8,
            "startOffset": 182,
            "endOffsetExclusive": 364,
            "eligibleUsers": 1457,
            "selectedUserIdsSha256": "83162b251fea847190e4561fdddd53f76a7c1e1d2f2d8a2435432237893e5b51"
          },
          "queryJobId": "mcp_ch_job_65af5c8f9d404ce6bb460b15ce1d7201",
          "executionMode": "async",
          "querySha256": "a8172878eebaf55fa1b709bb3728b54ac5b2ecd8583533d3a26bf423f588c7a9",
          "resultSha256": "d449e32f79a78fb9ae2865ba5a0f5eccf39c3e3721afdfbc8a91867bd5887fbc",
          "rowCount": 132
        },
        {
          "id": "2024-09-01_2025-03-01_u2of4",
          "window": {
            "startInclusive": "2024-09-01",
            "endExclusive": "2025-03-01"
          },
          "userShard": {
            "index": 1,
            "count": 4,
            "startOffset": 364,
            "endOffsetExclusive": 728,
            "eligibleUsers": 1457,
            "selectedUserIdsSha256": "0eaacf06e2c4e4f27151577c1a665bf14cd59c926850dc50a57c9c47b99f2001"
          },
          "queryJobId": "mcp_ch_job_5ede7cde25bd42c8bb36ecc295a789a0",
          "executionMode": "async",
          "querySha256": "747cddb6f0ee9ee79127571f24ffb556eea916eb39af6ca7eff8c7333b8a4a31",
          "resultSha256": "7fa2c48a6fe903d76c80b195ded63cef66d5c276d90821c1091d73484bd8f1f0",
          "rowCount": 132
        },
        {
          "id": "2024-09-01_2025-03-01_u2of2",
          "window": {
            "startInclusive": "2024-09-01",
            "endExclusive": "2025-03-01"
          },
          "userShard": {
            "index": 1,
            "count": 2,
            "startOffset": 728,
            "endOffsetExclusive": 1457,
            "eligibleUsers": 1457,
            "selectedUserIdsSha256": "9defe9af0d7be3db47c302edebb96850e2c8d43bf2a0187dbf45578f13ef0997"
          },
          "queryJobId": "mcp_ch_job_73863c77b8a84bb2a31681e5f44d554f",
          "executionMode": "async",
          "querySha256": "7b87c00845320463651221c56f20e934dc781aafc90c927a4624bd735f142555",
          "resultSha256": "f14b7cb461a198ac68d35499a62d3af34e6feddbb37930ffe55271d8468bc1c3",
          "rowCount": 132
        },
        {
          "id": "2025-03-01_2025-09-01_u1of4",
          "window": {
            "startInclusive": "2025-03-01",
            "endExclusive": "2025-09-01"
          },
          "userShard": {
            "index": 0,
            "count": 4,
            "startOffset": 0,
            "endOffsetExclusive": 471,
            "eligibleUsers": 1887,
            "selectedUserIdsSha256": "0b789ad3bb8ffe8c04bad4fcb972a54d4d3688d1b7994bafb8debe01270d342c"
          },
          "queryJobId": "mcp_ch_job_9edac110df284553be1635ebea88dcf6",
          "executionMode": "async",
          "querySha256": "942b5b61a9dcf103eba3a5086f68950a7fbfb3eae88fac34a0b6bd7febc5ca40",
          "resultSha256": "880e56399f93338a4c01909672b84ac02ae44860e48f15635cefbbd1f45659c1",
          "rowCount": 132
        },
        {
          "id": "2025-03-01_2025-09-01_u2of4",
          "window": {
            "startInclusive": "2025-03-01",
            "endExclusive": "2025-09-01"
          },
          "userShard": {
            "index": 1,
            "count": 4,
            "startOffset": 471,
            "endOffsetExclusive": 943,
            "eligibleUsers": 1887,
            "selectedUserIdsSha256": "900b90142f30128b0e166e7bba1fd2327045b8b9fe7800eeb9ffdb3ff24e7cc1"
          },
          "queryJobId": "mcp_ch_job_f1676c2d9de84cdc87242a4ea73b878e",
          "executionMode": "async",
          "querySha256": "83de93f9c46744a2d5063f93b3dc70ce72bd769779f38b3494e86f3983dd1570",
          "resultSha256": "fa9d82d754f0c929f56fb06fa409ec63c1201605d9300d7bb42683bccb188730",
          "rowCount": 132
        },
        {
          "id": "2025-03-01_2025-09-01_u2of2",
          "window": {
            "startInclusive": "2025-03-01",
            "endExclusive": "2025-09-01"
          },
          "userShard": {
            "index": 1,
            "count": 2,
            "startOffset": 943,
            "endOffsetExclusive": 1887,
            "eligibleUsers": 1887,
            "selectedUserIdsSha256": "a30e3e07831fa0ba0ef832b6649eec19dc380f5a47bcb20d62107e593f914b62"
          },
          "queryJobId": "mcp_ch_job_05203607e57c4ef2a86236588b1193fe",
          "executionMode": "async",
          "querySha256": "9901edccc068f61234bc82a9ebdada498d812917e227ede2d538b39576c7a1f7",
          "resultSha256": "5f7bc63966ce3a0bb7ea5b6ad4448ef25f1c050ec69478b07e35ba20821a3a33",
          "rowCount": 132
        },
        {
          "id": "2025-09-01_2026-03-01_u1of4",
          "window": {
            "startInclusive": "2025-09-01",
            "endExclusive": "2026-03-01"
          },
          "userShard": {
            "index": 0,
            "count": 4,
            "startOffset": 0,
            "endOffsetExclusive": 553,
            "eligibleUsers": 2213,
            "selectedUserIdsSha256": "6a89975dcaaa98b95ee01447781a04d1605ea478910ff9ef3000a85b7eda6975"
          },
          "queryJobId": "mcp_ch_job_44f492bf5d244247a04016f722e5def6",
          "executionMode": "async",
          "querySha256": "3eb7791a01e110e73502776285ed73ad8090715fe6a78bb6c3cc6669d5161f63",
          "resultSha256": "f2186681c2e148bee29f4899f4381bdf8a0aac751019c24a7bea3aaea163bb32",
          "rowCount": 132
        },
        {
          "id": "2025-09-01_2026-03-01_u2of4",
          "window": {
            "startInclusive": "2025-09-01",
            "endExclusive": "2026-03-01"
          },
          "userShard": {
            "index": 1,
            "count": 4,
            "startOffset": 553,
            "endOffsetExclusive": 1106,
            "eligibleUsers": 2213,
            "selectedUserIdsSha256": "6e5552d8d4e04dc820ee7bc8af9faf8936c9ffbd3b9d69be5969395e541040d0"
          },
          "queryJobId": "mcp_ch_job_55c927d8e6e642268d9638a8081e6c3c",
          "executionMode": "async",
          "querySha256": "45e65e2bf87985609d71d275d9f240770754f5e5ce03a1410f02449dc6fa2a1e",
          "resultSha256": "e4d3744b6e38218cf0315168bb264bf040002592668d56fe8c56e90ef5dccca1",
          "rowCount": 132
        },
        {
          "id": "2025-09-01_2026-03-01_u3of4",
          "window": {
            "startInclusive": "2025-09-01",
            "endExclusive": "2026-03-01"
          },
          "userShard": {
            "index": 2,
            "count": 4,
            "startOffset": 1106,
            "endOffsetExclusive": 1659,
            "eligibleUsers": 2213,
            "selectedUserIdsSha256": "ae0476dad9adfeace3e2a070d76fb1457b281c86eecc1d5fc42afe700fdad377"
          },
          "queryJobId": "mcp_ch_job_7f04cba6ad4f4cd892ac2c904bf2d245",
          "executionMode": "async",
          "querySha256": "efde5a3e441461a3e096f26328eedbeabec61e6b8ca98bac06ed410103c45784",
          "resultSha256": "f7b9b42c1cd9fdb43dfbdedbbd55655e7fa70df950465174edd099870785f47b",
          "rowCount": 132
        },
        {
          "id": "2025-09-01_2026-03-01_u4of4",
          "window": {
            "startInclusive": "2025-09-01",
            "endExclusive": "2026-03-01"
          },
          "userShard": {
            "index": 3,
            "count": 4,
            "startOffset": 1659,
            "endOffsetExclusive": 2213,
            "eligibleUsers": 2213,
            "selectedUserIdsSha256": "8927367ea6d63bf9e6d56e071bf52d47c386fef0a7ff10cc993602ddec50b15a"
          },
          "queryJobId": "mcp_ch_job_b0ffd054208c4ec6a072345ad6646f43",
          "executionMode": "async",
          "querySha256": "6ed108fa4ca93c8cc30f52305ad57f3c4ecfeca982c27018a57be5d7ac123abd",
          "resultSha256": "e3bf4beb46ee27fe4eba1d6809cef0bb490945fedd4dbc151adf1afb87b69a88",
          "rowCount": 132
        },
        {
          "id": "2026-03-01_2026-07-22_u1of4",
          "window": {
            "startInclusive": "2026-03-01",
            "endExclusive": "2026-07-22"
          },
          "userShard": {
            "index": 0,
            "count": 4,
            "startOffset": 0,
            "endOffsetExclusive": 585,
            "eligibleUsers": 2341,
            "selectedUserIdsSha256": "b9f92273ae05fb56125a22e2838cbc415f20091164883d9921ed51c49cd90d59"
          },
          "queryJobId": "mcp_ch_job_d73ab5f5c9034abcbc2e964281e5853e",
          "executionMode": "async",
          "querySha256": "7ac990b2271406f6c0b60e7b9525a03751951575b831b5206ce8c02dfe109c15",
          "resultSha256": "ee3221cf2ec9117e9b46503acc48f36ece4dd51fc53adca35d5f5b184e25f3ff",
          "rowCount": 132
        },
        {
          "id": "2026-03-01_2026-07-22_u2of4",
          "window": {
            "startInclusive": "2026-03-01",
            "endExclusive": "2026-07-22"
          },
          "userShard": {
            "index": 1,
            "count": 4,
            "startOffset": 585,
            "endOffsetExclusive": 1170,
            "eligibleUsers": 2341,
            "selectedUserIdsSha256": "10bf1045f9d5d7e89dd760960a49c21368a0a39aa0232098350062c2d3d4d59b"
          },
          "queryJobId": "mcp_ch_job_91830dcdae01423f93775e4392332720",
          "executionMode": "async",
          "querySha256": "8520dd88c1dd684f48614b191c1e33704060dd811389b895b6808625e29ea482",
          "resultSha256": "13be19f7d0c9e60914a3d4178105342fea9097afa27e6856eef77eda3ca49ad0",
          "rowCount": 132
        },
        {
          "id": "2026-03-01_2026-07-22_u2of2",
          "window": {
            "startInclusive": "2026-03-01",
            "endExclusive": "2026-07-22"
          },
          "userShard": {
            "index": 1,
            "count": 2,
            "startOffset": 1170,
            "endOffsetExclusive": 2341,
            "eligibleUsers": 2341,
            "selectedUserIdsSha256": "316af8afd9b85dae15e137cc23ffa15ae976840276b068bcf1184b3dc9ef4bff"
          },
          "queryJobId": "mcp_ch_job_2efcadd6f54b416f888d818a51e3d2fb",
          "executionMode": "async",
          "querySha256": "698d00ef7b6147ae37b5c134160c342ca4f247d80459248e0a245f2ee5f8863f",
          "resultSha256": "41de72179d93f3157eab43a9e2f0a43faa242d6c15de744c56f0508886d172dd",
          "rowCount": 132
        }
      ]
    },
    "artifactSha256": "d6d63b72399215210a8956a79db31c4ece1dce5a4acc0924dcb0d87bca4daf4c"
  },
  "totals": {
    "cbet": {
      "opportunities": 33882395,
      "checksBack": 3516182,
      "cbets": 30366213,
      "facedRaises": 4026709,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0
    },
    "bbResponse": {
      "opportunities": 10033135,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 4442383,
      "calls": 3985208,
      "raises": 1605544,
      "other": 0
    }
  },
  "rows": [
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 176883,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 81310,
      "calls": 63626,
      "raises": 31947,
      "other": 0,
      "firstHandAt": "2023-09-01T00:29:13",
      "lastHandAt": "2026-07-21T23:43:02",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 170164,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 72657,
      "calls": 66697,
      "raises": 30810,
      "other": 0,
      "firstHandAt": "2023-09-01T10:20:06",
      "lastHandAt": "2026-07-21T23:35:19",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 343916,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 140607,
      "calls": 139976,
      "raises": 63333,
      "other": 0,
      "firstHandAt": "2023-09-01T00:07:01",
      "lastHandAt": "2026-07-21T23:52:30",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 352528,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 143907,
      "calls": 143837,
      "raises": 64784,
      "other": 0,
      "firstHandAt": "2023-09-01T00:03:27",
      "lastHandAt": "2026-07-21T23:37:35",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 154136,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 72049,
      "calls": 56343,
      "raises": 25744,
      "other": 0,
      "firstHandAt": "2023-09-01T03:04:53",
      "lastHandAt": "2026-07-21T23:29:05",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 145462,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 64579,
      "calls": 57078,
      "raises": 23805,
      "other": 0,
      "firstHandAt": "2023-09-01T00:42:34",
      "lastHandAt": "2026-07-21T23:25:37",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 291871,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 125658,
      "calls": 117378,
      "raises": 48835,
      "other": 0,
      "firstHandAt": "2023-09-01T08:04:32",
      "lastHandAt": "2026-07-21T23:52:16",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 291189,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 124901,
      "calls": 117347,
      "raises": 48941,
      "other": 0,
      "firstHandAt": "2023-09-01T00:09:55",
      "lastHandAt": "2026-07-21T23:54:20",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 393038,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 183371,
      "calls": 144528,
      "raises": 65139,
      "other": 0,
      "firstHandAt": "2023-09-01T00:34:59",
      "lastHandAt": "2026-07-21T23:54:51",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 350417,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 152308,
      "calls": 138804,
      "raises": 59305,
      "other": 0,
      "firstHandAt": "2023-09-01T00:10:04",
      "lastHandAt": "2026-07-21T23:51:19",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 669507,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 280664,
      "calls": 271301,
      "raises": 117542,
      "other": 0,
      "firstHandAt": "2023-09-01T00:26:48",
      "lastHandAt": "2026-07-21T23:50:44",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 691366,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 287985,
      "calls": 279620,
      "raises": 123761,
      "other": 0,
      "firstHandAt": "2023-09-01T00:06:57",
      "lastHandAt": "2026-07-21T23:25:25",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 326312,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 154944,
      "calls": 122119,
      "raises": 49249,
      "other": 0,
      "firstHandAt": "2023-09-01T00:39:09",
      "lastHandAt": "2026-07-21T23:38:55",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 295382,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 132426,
      "calls": 117261,
      "raises": 45695,
      "other": 0,
      "firstHandAt": "2023-09-01T01:00:59",
      "lastHandAt": "2026-07-21T23:51:13",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 561419,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 244761,
      "calls": 226762,
      "raises": 89896,
      "other": 0,
      "firstHandAt": "2023-09-01T00:37:34",
      "lastHandAt": "2026-07-21T23:53:35",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 564631,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 244292,
      "calls": 228473,
      "raises": 91866,
      "other": 0,
      "firstHandAt": "2023-09-01T00:43:16",
      "lastHandAt": "2026-07-21T23:54:54",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 344643,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 165259,
      "calls": 127917,
      "raises": 51467,
      "other": 0,
      "firstHandAt": "2023-09-01T01:11:53",
      "lastHandAt": "2026-07-21T23:47:02",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 296514,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 134823,
      "calls": 116014,
      "raises": 45677,
      "other": 0,
      "firstHandAt": "2023-09-01T01:17:08",
      "lastHandAt": "2026-07-21T23:54:46",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 544614,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 240652,
      "calls": 216644,
      "raises": 87318,
      "other": 0,
      "firstHandAt": "2023-09-01T00:50:06",
      "lastHandAt": "2026-07-21T23:46:31",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 596630,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 260075,
      "calls": 237573,
      "raises": 98982,
      "other": 0,
      "firstHandAt": "2023-09-01T00:03:46",
      "lastHandAt": "2026-07-21T23:50:16",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 282446,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 137897,
      "calls": 105289,
      "raises": 39260,
      "other": 0,
      "firstHandAt": "2023-09-01T01:33:08",
      "lastHandAt": "2026-07-21T23:53:01",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 245524,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 113888,
      "calls": 96539,
      "raises": 35097,
      "other": 0,
      "firstHandAt": "2023-09-01T01:12:51",
      "lastHandAt": "2026-07-21T23:54:18",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 451228,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 204830,
      "calls": 179290,
      "raises": 67108,
      "other": 0,
      "firstHandAt": "2023-09-01T00:36:53",
      "lastHandAt": "2026-07-21T23:46:11",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 486251,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 217514,
      "calls": 194680,
      "raises": 74057,
      "other": 0,
      "firstHandAt": "2023-09-01T01:04:21",
      "lastHandAt": "2026-07-21T23:46:58",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 107893,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 51911,
      "calls": 42249,
      "raises": 13733,
      "other": 0,
      "firstHandAt": "2023-09-01T00:09:05",
      "lastHandAt": "2026-07-21T23:23:41",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 90454,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 41777,
      "calls": 37388,
      "raises": 11289,
      "other": 0,
      "firstHandAt": "2023-09-01T00:04:41",
      "lastHandAt": "2026-07-21T22:24:05",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 165732,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 74197,
      "calls": 69965,
      "raises": 21570,
      "other": 0,
      "firstHandAt": "2023-09-01T01:37:35",
      "lastHandAt": "2026-07-21T23:35:37",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 187693,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 82028,
      "calls": 80936,
      "raises": 24729,
      "other": 0,
      "firstHandAt": "2023-09-01T00:38:39",
      "lastHandAt": "2026-07-21T23:45:35",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 89334,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 44040,
      "calls": 34698,
      "raises": 10596,
      "other": 0,
      "firstHandAt": "2023-09-01T08:37:50",
      "lastHandAt": "2026-07-21T22:44:19",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 75257,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 35280,
      "calls": 31159,
      "raises": 8818,
      "other": 0,
      "firstHandAt": "2023-09-01T10:46:19",
      "lastHandAt": "2026-07-21T23:48:20",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 137214,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 63053,
      "calls": 57928,
      "raises": 16233,
      "other": 0,
      "firstHandAt": "2023-09-01T02:07:55",
      "lastHandAt": "2026-07-21T22:52:22",
      "publishable": true
    },
    {
      "node": "bb_response",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 153487,
      "checksBack": 0,
      "cbets": 0,
      "facedRaises": 0,
      "folds": 68740,
      "calls": 65789,
      "raises": 18958,
      "other": 0,
      "firstHandAt": "2023-09-01T09:30:46",
      "lastHandAt": "2026-07-21T23:15:33",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "<20",
      "opportunities": 76603,
      "checksBack": 11106,
      "cbets": 65497,
      "facedRaises": 12453,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:41:17",
      "lastHandAt": "2026-07-21T23:33:38",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 238588,
      "checksBack": 31877,
      "cbets": 206711,
      "facedRaises": 34868,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:10:43",
      "lastHandAt": "2026-07-21T23:52:34",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 266132,
      "checksBack": 33727,
      "cbets": 232405,
      "facedRaises": 37246,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:30:08",
      "lastHandAt": "2026-07-21T23:49:24",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 590311,
      "checksBack": 69587,
      "cbets": 520724,
      "facedRaises": 80611,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:11:30",
      "lastHandAt": "2026-07-21T23:53:33",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 638855,
      "checksBack": 71147,
      "cbets": 567708,
      "facedRaises": 85049,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:02:15",
      "lastHandAt": "2026-07-21T23:16:42",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "<20",
      "opportunities": 53558,
      "checksBack": 7951,
      "cbets": 45607,
      "facedRaises": 8286,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:20:24",
      "lastHandAt": "2026-07-21T22:50:39",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 156759,
      "checksBack": 21298,
      "cbets": 135461,
      "facedRaises": 21880,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:15:13",
      "lastHandAt": "2026-07-21T23:52:38",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 190449,
      "checksBack": 23085,
      "cbets": 167364,
      "facedRaises": 25473,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T02:08:20",
      "lastHandAt": "2026-07-21T23:09:43",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 468840,
      "checksBack": 52962,
      "cbets": 415878,
      "facedRaises": 60834,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:13:45",
      "lastHandAt": "2026-07-21T23:49:42",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 531076,
      "checksBack": 56741,
      "cbets": 474335,
      "facedRaises": 66707,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:42:27",
      "lastHandAt": "2026-07-21T23:54:42",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "EP",
      "depthBand": "<20",
      "opportunities": 12810,
      "checksBack": 1633,
      "cbets": 11177,
      "facedRaises": 1696,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T16:29:01",
      "lastHandAt": "2026-07-21T22:52:02",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "EP",
      "depthBand": "20-30",
      "opportunities": 28579,
      "checksBack": 3235,
      "cbets": 25344,
      "facedRaises": 3463,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T02:10:49",
      "lastHandAt": "2026-07-21T22:10:05",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "EP",
      "depthBand": "30-40",
      "opportunities": 33199,
      "checksBack": 3499,
      "cbets": 29700,
      "facedRaises": 3767,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T10:13:15",
      "lastHandAt": "2026-07-21T21:45:39",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "EP",
      "depthBand": "40-70",
      "opportunities": 92796,
      "checksBack": 8789,
      "cbets": 84007,
      "facedRaises": 9885,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:07:36",
      "lastHandAt": "2026-07-21T21:38:01",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "EP",
      "depthBand": "70+",
      "opportunities": 108712,
      "checksBack": 9601,
      "cbets": 99111,
      "facedRaises": 11027,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:31:22",
      "lastHandAt": "2026-07-21T23:37:48",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "HJ",
      "depthBand": "<20",
      "opportunities": 46424,
      "checksBack": 6577,
      "cbets": 39847,
      "facedRaises": 6595,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:42:07",
      "lastHandAt": "2026-07-21T23:38:19",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "HJ",
      "depthBand": "20-30",
      "opportunities": 120414,
      "checksBack": 15708,
      "cbets": 104706,
      "facedRaises": 15894,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:16:47",
      "lastHandAt": "2026-07-21T23:46:20",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "HJ",
      "depthBand": "30-40",
      "opportunities": 145361,
      "checksBack": 16496,
      "cbets": 128865,
      "facedRaises": 18771,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:06:25",
      "lastHandAt": "2026-07-21T23:40:55",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "HJ",
      "depthBand": "40-70",
      "opportunities": 374470,
      "checksBack": 39706,
      "cbets": 334764,
      "facedRaises": 45990,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:33:07",
      "lastHandAt": "2026-07-21T23:52:12",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "HJ",
      "depthBand": "70+",
      "opportunities": 435109,
      "checksBack": 43251,
      "cbets": 391858,
      "facedRaises": 51217,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:38:14",
      "lastHandAt": "2026-07-21T23:48:45",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "MP",
      "depthBand": "<20",
      "opportunities": 56516,
      "checksBack": 7695,
      "cbets": 48821,
      "facedRaises": 7814,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:14:37",
      "lastHandAt": "2026-07-21T22:24:41",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "MP",
      "depthBand": "20-30",
      "opportunities": 131131,
      "checksBack": 15837,
      "cbets": 115294,
      "facedRaises": 16359,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:48:51",
      "lastHandAt": "2026-07-21T23:47:19",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "MP",
      "depthBand": "30-40",
      "opportunities": 158122,
      "checksBack": 16955,
      "cbets": 141167,
      "facedRaises": 19090,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:47:33",
      "lastHandAt": "2026-07-21T23:44:36",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "MP",
      "depthBand": "40-70",
      "opportunities": 429392,
      "checksBack": 42550,
      "cbets": 386842,
      "facedRaises": 49172,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:27:33",
      "lastHandAt": "2026-07-21T23:46:32",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league1",
      "position": "MP",
      "depthBand": "70+",
      "opportunities": 509441,
      "checksBack": 47225,
      "cbets": 462216,
      "facedRaises": 55039,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:05:59",
      "lastHandAt": "2026-07-21T23:50:52",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "<20",
      "opportunities": 200779,
      "checksBack": 25489,
      "cbets": 175290,
      "facedRaises": 30812,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:14:29",
      "lastHandAt": "2026-07-21T23:53:57",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 588850,
      "checksBack": 66544,
      "cbets": 522306,
      "facedRaises": 81932,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:30:51",
      "lastHandAt": "2026-07-21T23:52:44",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 611960,
      "checksBack": 63070,
      "cbets": 548890,
      "facedRaises": 82380,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:28:33",
      "lastHandAt": "2026-07-21T23:52:25",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 1273020,
      "checksBack": 119809,
      "cbets": 1153211,
      "facedRaises": 168069,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:10:15",
      "lastHandAt": "2026-07-21T23:54:06",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 1386671,
      "checksBack": 119253,
      "cbets": 1267418,
      "facedRaises": 180010,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:20:29",
      "lastHandAt": "2026-07-21T23:47:47",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "<20",
      "opportunities": 125388,
      "checksBack": 17320,
      "cbets": 108068,
      "facedRaises": 17733,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:04:52",
      "lastHandAt": "2026-07-21T23:44:19",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 363109,
      "checksBack": 43337,
      "cbets": 319772,
      "facedRaises": 48323,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:23:49",
      "lastHandAt": "2026-07-21T23:54:22",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 420641,
      "checksBack": 44259,
      "cbets": 376382,
      "facedRaises": 54483,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:14:41",
      "lastHandAt": "2026-07-21T23:48:14",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 978468,
      "checksBack": 95307,
      "cbets": 883161,
      "facedRaises": 122846,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:06:10",
      "lastHandAt": "2026-07-21T23:50:12",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 1105759,
      "checksBack": 99367,
      "cbets": 1006392,
      "facedRaises": 134774,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:12:52",
      "lastHandAt": "2026-07-21T23:52:22",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "EP",
      "depthBand": "<20",
      "opportunities": 26334,
      "checksBack": 3501,
      "cbets": 22833,
      "facedRaises": 3163,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T04:53:00",
      "lastHandAt": "2026-07-21T21:54:00",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "EP",
      "depthBand": "20-30",
      "opportunities": 62254,
      "checksBack": 7314,
      "cbets": 54940,
      "facedRaises": 7085,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:08:33",
      "lastHandAt": "2026-07-21T22:41:41",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "EP",
      "depthBand": "30-40",
      "opportunities": 71706,
      "checksBack": 7335,
      "cbets": 64371,
      "facedRaises": 7829,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:11:43",
      "lastHandAt": "2026-07-21T23:35:28",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "EP",
      "depthBand": "40-70",
      "opportunities": 191426,
      "checksBack": 18447,
      "cbets": 172979,
      "facedRaises": 20228,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:01:55",
      "lastHandAt": "2026-07-21T23:51:07",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "EP",
      "depthBand": "70+",
      "opportunities": 216401,
      "checksBack": 19761,
      "cbets": 196640,
      "facedRaises": 21696,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:46:35",
      "lastHandAt": "2026-07-21T23:39:36",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "HJ",
      "depthBand": "<20",
      "opportunities": 102259,
      "checksBack": 14205,
      "cbets": 88054,
      "facedRaises": 13685,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:06:40",
      "lastHandAt": "2026-07-21T23:22:00",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "HJ",
      "depthBand": "20-30",
      "opportunities": 272993,
      "checksBack": 32602,
      "cbets": 240391,
      "facedRaises": 34375,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:28:52",
      "lastHandAt": "2026-07-21T23:41:06",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "HJ",
      "depthBand": "30-40",
      "opportunities": 317399,
      "checksBack": 33363,
      "cbets": 284036,
      "facedRaises": 38793,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:11:19",
      "lastHandAt": "2026-07-21T23:45:48",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "HJ",
      "depthBand": "40-70",
      "opportunities": 774749,
      "checksBack": 75234,
      "cbets": 699515,
      "facedRaises": 91846,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:12:30",
      "lastHandAt": "2026-07-21T23:51:46",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "HJ",
      "depthBand": "70+",
      "opportunities": 894494,
      "checksBack": 80586,
      "cbets": 813908,
      "facedRaises": 102266,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:06:22",
      "lastHandAt": "2026-07-21T23:46:13",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "MP",
      "depthBand": "<20",
      "opportunities": 116793,
      "checksBack": 16104,
      "cbets": 100689,
      "facedRaises": 15095,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:29:00",
      "lastHandAt": "2026-07-21T22:42:01",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "MP",
      "depthBand": "20-30",
      "opportunities": 288986,
      "checksBack": 34134,
      "cbets": 254852,
      "facedRaises": 34555,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:54:26",
      "lastHandAt": "2026-07-21T23:54:29",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "MP",
      "depthBand": "30-40",
      "opportunities": 336974,
      "checksBack": 35431,
      "cbets": 301543,
      "facedRaises": 38680,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:23:49",
      "lastHandAt": "2026-07-21T23:53:43",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "MP",
      "depthBand": "40-70",
      "opportunities": 867684,
      "checksBack": 83993,
      "cbets": 783691,
      "facedRaises": 96282,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:03:42",
      "lastHandAt": "2026-07-21T23:53:27",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league2",
      "position": "MP",
      "depthBand": "70+",
      "opportunities": 1011071,
      "checksBack": 92182,
      "cbets": 918889,
      "facedRaises": 107044,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:01:42",
      "lastHandAt": "2026-07-21T23:49:05",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "<20",
      "opportunities": 212910,
      "checksBack": 25280,
      "cbets": 187630,
      "facedRaises": 30181,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T04:25:09",
      "lastHandAt": "2026-07-21T23:46:42",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 542054,
      "checksBack": 52686,
      "cbets": 489368,
      "facedRaises": 70627,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:53:43",
      "lastHandAt": "2026-07-21T23:52:06",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 553668,
      "checksBack": 47880,
      "cbets": 505788,
      "facedRaises": 70604,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:29:15",
      "lastHandAt": "2026-07-21T23:53:16",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 1133053,
      "checksBack": 90572,
      "cbets": 1042481,
      "facedRaises": 141669,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:02:23",
      "lastHandAt": "2026-07-21T23:48:56",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 1300836,
      "checksBack": 95661,
      "cbets": 1205175,
      "facedRaises": 160884,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:18:10",
      "lastHandAt": "2026-07-21T23:55:00",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "<20",
      "opportunities": 127192,
      "checksBack": 16973,
      "cbets": 110219,
      "facedRaises": 16346,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:47:40",
      "lastHandAt": "2026-07-21T23:42:33",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 339424,
      "checksBack": 35767,
      "cbets": 303657,
      "facedRaises": 42193,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:15:30",
      "lastHandAt": "2026-07-21T23:53:29",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 376919,
      "checksBack": 35341,
      "cbets": 341578,
      "facedRaises": 45572,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:22:49",
      "lastHandAt": "2026-07-21T23:42:35",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 837053,
      "checksBack": 73011,
      "cbets": 764042,
      "facedRaises": 98773,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:05:01",
      "lastHandAt": "2026-07-21T23:53:52",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 989648,
      "checksBack": 81100,
      "cbets": 908548,
      "facedRaises": 115976,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:01:15",
      "lastHandAt": "2026-07-21T23:54:14",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "EP",
      "depthBand": "<20",
      "opportunities": 24448,
      "checksBack": 3455,
      "cbets": 20993,
      "facedRaises": 2789,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T16:59:57",
      "lastHandAt": "2026-07-21T23:51:10",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "EP",
      "depthBand": "20-30",
      "opportunities": 59474,
      "checksBack": 6955,
      "cbets": 52519,
      "facedRaises": 6347,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T04:26:49",
      "lastHandAt": "2026-07-21T22:01:29",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "EP",
      "depthBand": "30-40",
      "opportunities": 67238,
      "checksBack": 6978,
      "cbets": 60260,
      "facedRaises": 6824,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:04:30",
      "lastHandAt": "2026-07-21T21:26:36",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "EP",
      "depthBand": "40-70",
      "opportunities": 168834,
      "checksBack": 17068,
      "cbets": 151766,
      "facedRaises": 16967,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:28:02",
      "lastHandAt": "2026-07-21T23:41:06",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "EP",
      "depthBand": "70+",
      "opportunities": 194193,
      "checksBack": 18918,
      "cbets": 175275,
      "facedRaises": 18894,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:39:59",
      "lastHandAt": "2026-07-21T23:24:10",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "HJ",
      "depthBand": "<20",
      "opportunities": 96638,
      "checksBack": 13492,
      "cbets": 83146,
      "facedRaises": 11664,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:13:43",
      "lastHandAt": "2026-07-21T23:46:22",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "HJ",
      "depthBand": "20-30",
      "opportunities": 249605,
      "checksBack": 27576,
      "cbets": 222029,
      "facedRaises": 28961,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:29:37",
      "lastHandAt": "2026-07-21T23:35:41",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "HJ",
      "depthBand": "30-40",
      "opportunities": 279373,
      "checksBack": 27549,
      "cbets": 251824,
      "facedRaises": 32145,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:13:20",
      "lastHandAt": "2026-07-21T23:53:02",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "HJ",
      "depthBand": "40-70",
      "opportunities": 652309,
      "checksBack": 61066,
      "cbets": 591243,
      "facedRaises": 73173,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:00:43",
      "lastHandAt": "2026-07-21T23:52:39",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "HJ",
      "depthBand": "70+",
      "opportunities": 787382,
      "checksBack": 69417,
      "cbets": 717965,
      "facedRaises": 86097,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:14:27",
      "lastHandAt": "2026-07-21T23:51:44",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "MP",
      "depthBand": "<20",
      "opportunities": 110559,
      "checksBack": 15532,
      "cbets": 95027,
      "facedRaises": 12984,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:20:31",
      "lastHandAt": "2026-07-21T23:32:41",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "MP",
      "depthBand": "20-30",
      "opportunities": 275982,
      "checksBack": 31663,
      "cbets": 244319,
      "facedRaises": 30721,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:36:14",
      "lastHandAt": "2026-07-21T23:29:14",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "MP",
      "depthBand": "30-40",
      "opportunities": 313596,
      "checksBack": 32845,
      "cbets": 280751,
      "facedRaises": 33960,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:27:20",
      "lastHandAt": "2026-07-21T23:48:41",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "MP",
      "depthBand": "40-70",
      "opportunities": 765773,
      "checksBack": 75486,
      "cbets": 690287,
      "facedRaises": 81418,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:31:57",
      "lastHandAt": "2026-07-21T23:48:42",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "league3",
      "position": "MP",
      "depthBand": "70+",
      "opportunities": 928632,
      "checksBack": 88231,
      "cbets": 840401,
      "facedRaises": 95817,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T02:28:38",
      "lastHandAt": "2026-07-21T23:47:27",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "<20",
      "opportunities": 89104,
      "checksBack": 15385,
      "cbets": 73719,
      "facedRaises": 10558,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:14:00",
      "lastHandAt": "2026-07-21T23:33:28",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "20-30",
      "opportunities": 186144,
      "checksBack": 26033,
      "cbets": 160111,
      "facedRaises": 20731,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:05:07",
      "lastHandAt": "2026-07-21T23:49:01",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "30-40",
      "opportunities": 185869,
      "checksBack": 24000,
      "cbets": 161869,
      "facedRaises": 19761,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:08:26",
      "lastHandAt": "2026-07-21T23:41:35",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "40-70",
      "opportunities": 375491,
      "checksBack": 47593,
      "cbets": 327898,
      "facedRaises": 38780,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:43:53",
      "lastHandAt": "2026-07-21T23:49:27",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "BTN",
      "depthBand": "70+",
      "opportunities": 437779,
      "checksBack": 53704,
      "cbets": 384075,
      "facedRaises": 44284,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:40:47",
      "lastHandAt": "2026-07-21T23:47:41",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "<20",
      "opportunities": 54270,
      "checksBack": 10252,
      "cbets": 44018,
      "facedRaises": 5778,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T11:40:28",
      "lastHandAt": "2026-07-21T22:39:34",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "20-30",
      "opportunities": 122424,
      "checksBack": 18228,
      "cbets": 104196,
      "facedRaises": 12730,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:24:22",
      "lastHandAt": "2026-07-21T22:12:06",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "30-40",
      "opportunities": 130603,
      "checksBack": 17876,
      "cbets": 112727,
      "facedRaises": 13161,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:19:04",
      "lastHandAt": "2026-07-21T23:50:04",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "40-70",
      "opportunities": 281532,
      "checksBack": 38383,
      "cbets": 243149,
      "facedRaises": 27727,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:54:42",
      "lastHandAt": "2026-07-21T23:38:04",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "CO",
      "depthBand": "70+",
      "opportunities": 336928,
      "checksBack": 44565,
      "cbets": 292363,
      "facedRaises": 32489,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:34:51",
      "lastHandAt": "2026-07-21T23:16:30",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "EP",
      "depthBand": "<20",
      "opportunities": 10603,
      "checksBack": 1987,
      "cbets": 8616,
      "facedRaises": 1009,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T06:38:59",
      "lastHandAt": "2026-07-21T19:29:43",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "EP",
      "depthBand": "20-30",
      "opportunities": 23445,
      "checksBack": 3551,
      "cbets": 19894,
      "facedRaises": 2243,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T08:05:02",
      "lastHandAt": "2026-07-21T20:10:03",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "EP",
      "depthBand": "30-40",
      "opportunities": 25433,
      "checksBack": 3641,
      "cbets": 21792,
      "facedRaises": 2312,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T10:36:47",
      "lastHandAt": "2026-07-21T22:20:28",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "EP",
      "depthBand": "40-70",
      "opportunities": 61328,
      "checksBack": 8746,
      "cbets": 52582,
      "facedRaises": 5551,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:27:51",
      "lastHandAt": "2026-07-21T19:53:11",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "EP",
      "depthBand": "70+",
      "opportunities": 71197,
      "checksBack": 9832,
      "cbets": 61365,
      "facedRaises": 6117,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:01:15",
      "lastHandAt": "2026-07-21T21:29:26",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "HJ",
      "depthBand": "<20",
      "opportunities": 40205,
      "checksBack": 7697,
      "cbets": 32508,
      "facedRaises": 4015,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T08:03:58",
      "lastHandAt": "2026-07-21T20:38:21",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "HJ",
      "depthBand": "20-30",
      "opportunities": 89804,
      "checksBack": 13844,
      "cbets": 75960,
      "facedRaises": 8858,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:10:47",
      "lastHandAt": "2026-07-21T22:50:05",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "HJ",
      "depthBand": "30-40",
      "opportunities": 97439,
      "checksBack": 13933,
      "cbets": 83506,
      "facedRaises": 9669,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:36:35",
      "lastHandAt": "2026-07-21T22:06:54",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "HJ",
      "depthBand": "40-70",
      "opportunities": 220746,
      "checksBack": 31298,
      "cbets": 189448,
      "facedRaises": 20722,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:37:03",
      "lastHandAt": "2026-07-21T23:46:59",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "HJ",
      "depthBand": "70+",
      "opportunities": 271263,
      "checksBack": 37964,
      "cbets": 233299,
      "facedRaises": 24653,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:47:21",
      "lastHandAt": "2026-07-21T22:45:57",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "MP",
      "depthBand": "<20",
      "opportunities": 47283,
      "checksBack": 9450,
      "cbets": 37833,
      "facedRaises": 4636,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:10:18",
      "lastHandAt": "2026-07-21T22:01:38",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "MP",
      "depthBand": "20-30",
      "opportunities": 105411,
      "checksBack": 16420,
      "cbets": 88991,
      "facedRaises": 10150,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:30:41",
      "lastHandAt": "2026-07-21T22:50:54",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "MP",
      "depthBand": "30-40",
      "opportunities": 116156,
      "checksBack": 17146,
      "cbets": 99010,
      "facedRaises": 10878,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:10:34",
      "lastHandAt": "2026-07-21T22:54:36",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "MP",
      "depthBand": "40-70",
      "opportunities": 273653,
      "checksBack": 39536,
      "cbets": 234117,
      "facedRaises": 24872,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T00:08:04",
      "lastHandAt": "2026-07-21T23:26:34",
      "publishable": true
    },
    {
      "node": "cbet",
      "cohort": "novice",
      "position": "MP",
      "depthBand": "70+",
      "opportunities": 341677,
      "checksBack": 48431,
      "cbets": 293246,
      "facedRaises": 30269,
      "folds": 0,
      "calls": 0,
      "raises": 0,
      "other": 0,
      "firstHandAt": "2023-09-01T01:12:57",
      "lastHandAt": "2026-07-21T23:07:07",
      "publishable": true
    }
  ]
} /* FF_FULL_HISTORY_FIELD_END */;
  const seatOrder = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

  const seats = (stack, villain, open) => seatOrder.map((label) => ({
    label,
    state: label === "BB" ? "hero" : label === villain ? "waiting" : "folded",
    // `stack` is the hand-start stack. `stackBb` is the live stack before the
    // current flop bet; the shared renderer subtracts that street bet itself.
    stackBb: stack - (label === villain ? open : label === "BB" ? open + 1 : label === "SB" ? 0.5 : 0),
    startingStackBb: stack
  }));

  const optimisticXr = (discipline) =>
    `Так можно сыграть как эксплойт, если у тебя есть уверенный рид на большой оверфолд именно на этот сайз. Базовая линия дисциплинированнее: ${discipline}`;

  const actions = (raiseTo, feedback) => [
    { key: "fold", label: "Пас", feedback: feedback.fold },
    { key: "call", label: "Колл", feedback: feedback.call },
    { key: "checkraise", label: `Чек-рейз до ${raiseTo} BB`, feedback: feedback.checkraise }
  ];

  const spot = ({
    id, title, hand, cards, board, villain = "BTN", stack = 40, open = 2.2,
    bet = 1.8, raiseTo = 5.5, question, answer, context, correct, feedback
  }) => {
    const continuation = window.FF_FLOP_CHECKRAISE_CONTINUATIONS?.getContinuation?.(id) || null;
    const potBeforeAction = Math.round((open * 2 + 1.5) * 10) / 10;
    return {
      id,
      title,
      hand,
      question,
      answer,
      context,
      ...(continuation ? { continuation } : {}),
      table: {
      seats: seats(stack, villain, open),
      heroPosition: "BB",
      heroStack: `${Math.round((stack - open - 1) * 10) / 10} BB`,
      effectiveStack: `${stack} BB`,
      pot: `${potBeforeAction} BB`,
      potBeforeAction: true,
      anteBb: 1,
      heroCards: cards,
      boardCards: board,
      street: "flop",
      actionLine: ["BB check", `${villain} bet ${bet} BB`],
      historyLine: `${villain} открывает ${open} BB · BB коллирует · на флопе двое`,
      toCall: bet,
      currentBet: bet,
      dealerPosition: "BTN"
      },
      options: actions(raiseTo, feedback).map((option) => ({
        ...option,
        correct: option.key === correct,
        ...(option.key === "checkraise" && correct !== "checkraise" ? { acceptableExploit: true } : {})
      }))
    };
  };

  const practice = [
    spot({
      id: "xr-t9-backdoors", title: "K82r · решение с T9s", hand: "T9s", cards: ["Th", "9h"], board: ["Kc", "8h", "2s"],
      question: "BTN поставил треть банка после твоего чека. Какая базовая учебная линия с T♥9♥?",
      answer: "Чек-рейз: у T♥9♥ нет готового дро, зато есть бэкдор-стрит и бэкдор-флеш. Это выборочный учебный кандидат, а не обязательный рейз каждой T9s.",
      context: "BB защитил против BTN. Ищем лучший воздух с несколькими путями усиления, а не рейзим весь диапазон.",
      correct: "checkraise",
      feedback: {
        fold: "Пас возможен в смешанной стратегии, но T♥9♥ имеет два полезных бэкдор-направления и подходит для активной части лучше несвязанного воздуха.",
        call: "У T-хай нет готовой пары или дро; если продолжаем с этой рукой, чек-рейз использует её будущие карты лучше пассивного колла.",
        checkraise: "Верно: бэкдор-стрит плюс бэкдор-флеш делают T♥9♥ осмысленным выборочным полублефом."
      }
    }),
    spot({
      id: "xr-97-double-backdoor", title: "K82r · 97s и два бэкдора", hand: "97s", cards: ["9h", "7h"], board: ["Kc", "8h", "2s"],
      question: "У 9♥7♥ нет готовой пары или дро. Остаётся ли рука кандидатом на чек-рейз?",
      answer: "Да, как редкий учебный полублеф: у руки бэкдор-стрит и бэкдор-флеш. Важно выбрать лучший воздух, а не любой воздух.",
      context: "Одна черва на флопе вместе с двумя червами в руке оставляет раннер-раннер флеш; 6/T и следующие карты дают стритовые направления.",
      correct: "checkraise",
      feedback: {
        fold: "Пас не катастрофа в реальной смешанной стратегии, но здесь 97s выбран как лучший из слабых кандидатов благодаря двум бэкдор-направлениям.",
        call: "Без готовой пары колл реализует эквити хуже. Если продолжаем с этой рукой, агрессивная линия логичнее пассивной.",
        checkraise: "Верно: это выборочный полублеф с двумя бэкдор-направлениями, а не рейз по принципу «две случайные карты»."
      }
    }),
    spot({
      id: "xr-kq-value", title: "K82r · сильный Kx на вэлью", hand: "KQ", cards: ["Kd", "Qd"], board: ["Kc", "8h", "2s"],
      question: "Нужно ли оставлять все топ-пары только в чек-колле, если у тебя K♦Q♦?",
      answer: "Нет. В учебной модели часть сильных Kx начинает строить вэлью через чек-рейз, чтобы у блефов была сильная пара.",
      context: "KQ — верх топ-пар диапазона BB. Более слабые Kx чаще сохраняют ветку чек-колла.",
      correct: "checkraise",
      feedback: {
        fold: "Сильная топ-пара далеко впереди диапазона маленькой ставки BTN.",
        call: "Колл допустим как часть микса, но если всё сильное вэлью только коллирует, чек-рейз остаётся без естественной опоры.",
        checkraise: "Верно: KQ даёт вэлью-часть диапазона чек-рейза и может получить продолжение от Kx хуже и дро."
      }
    }),
    spot({
      id: "xr-jt-gutshot", title: "K92r · JT с гатшотом", hand: "JTs", cards: ["Jc", "Tc"], board: ["Ks", "9d", "2c"],
      question: "На K♠9♦2♣ у J♣T♣ появился гатшот. Как использовать сочетание эквити и давления?",
      answer: "Чек-рейз — учебный кандидат: Q закрывает стрит, а трефы дают бэкдор-флеш. Рука лучше случайного воздуха продолжает против колла.",
      context: "Выбирай блефы, которые могут усилиться, если BTN не сфолдит сразу.",
      correct: "checkraise",
      feedback: {
        fold: "Гатшот плюс бэкдор-флеш дают достаточно будущих карт, чтобы рассмотреть активную линию.",
        call: "Колл сохраняет эквити, но в этом уроке JT входит в выборочную агрессивную часть защиты BB.",
        checkraise: "Верно: живая эквити делает давление устойчивее, чем рейз с полностью мёртвым воздухом."
      }
    }),
    spot({
      id: "xr-qt-gutshot", title: "K92r · QT с гатшотом", hand: "QTs", cards: ["Qh", "Th"], board: ["Ks", "9d", "2h"],
      question: "Q♥T♥ собирает стрит на J и раннер-раннер флеш на двух червах. Подходит ли рука для активной ветки?",
      answer: "Да, как учебный кандидат на чек-рейз: готовый гатшот и бэкдор-флеш дают продолжение после колла.",
      context: "Это не обязательный рейз каждой QT, а пример руки с двумя понятными путями усиления.",
      correct: "checkraise",
      feedback: {
        fold: "У QT есть готовый гатшот и бэкдор-флеш: среди воздуха это полезный кандидат для продолжения.",
        call: "Колл возможен в миксе, но урок выделяет QT в агрессивную часть благодаря двум путям усиления.",
        checkraise: "Верно: J закрывает стрит, а две следующие червы могут закрыть флеш."
      }
    }),
    spot({
      id: "xr-qj-gutshot", title: "K92r · QJ с гатшотом", hand: "QJs", cards: ["Qd", "Jd"], board: ["Kh", "9c", "2d"],
      question: "Q♦J♦ усиливается на T и имеет бэкдор-бубны. Какая учебная линия использует эту эквити?",
      answer: "Чек-рейз: QJ связывает гатшот, бэкдор-флеш и блокеры к сильным KQ/KJ-продолжениям.",
      context: "Три причины делают QJ лучше несвязанного Q-high, если BB выбирает полублеф.",
      correct: "checkraise",
      feedback: {
        fold: "Пас допустим в смешанной стратегии, но QJ слишком хорошо соединяет блокеры и будущие карты для нижнего воздуха.",
        call: "Колл сохраняет эквити, однако учебная задача — распознать QJ как одного из лучших агрессивных кандидатов.",
        checkraise: "Верно: T закрывает стрит, бубны дают бэкдор, Q/J блокируют часть сильных Kx."
      }
    }),
    spot({
      id: "xr-k9-two-pair", title: "K92r · две пары", hand: "K9", cards: ["Kd", "9c"], board: ["Ks", "9d", "2h"],
      question: "BTN поставил 33% банка. Какая линия начинает добор с K♦9♣?",
      answer: "Чек-рейз на вэлью. Две пары строят банк и дают естественную сильную часть диапазона рейза.",
      context: "Размер 5.5 BB — фиксированный учебный сайз, не утверждение об единственном верном размере.",
      correct: "checkraise",
      feedback: {
        fold: "Две пары — верх диапазона BB и не могут сдаваться на маленькую ставку.",
        call: "Колл оставляет блефы, но часть двух пар нужна в рейзе для добора и баланса полублефов.",
        checkraise: "Верно: K9 получает вэлью от Kx и дро и поддерживает блефовую часть чек-рейза."
      }
    }),
    spot({
      id: "xr-k2-two-pair", title: "K92r · нижние две пары", hand: "K2", cards: ["Kh", "2c"], board: ["Ks", "9d", "2h"],
      question: "У K♥2♣ две пары. Как получить вэлью и поддержать полублефовую часть рейза?",
      answer: "Чек-рейз: K2 строит банк против Kx и дро, оставаясь ясной сильной частью диапазона.",
      context: "K2 сильнее одной пары, хотя нижняя пара доски выглядит скромно.",
      correct: "checkraise",
      feedback: {
        fold: "Две пары не могут сдаваться на маленькую ставку.",
        call: "Колл возможен выборочно, но часть K2 нужна во вэлью-чек-рейзе.",
        checkraise: "Верно: K2 добирает с Kx и даёт блефам сильную пару в той же линии."
      }
    }),
    spot({
      id: "xr-99-set", title: "K92r · средний сет", hand: "99", cards: ["9s", "9c"], board: ["Kh", "9d", "2s"], villain: "CO", bet: 1.8,
      question: "CO поставил треть банка, у BB сет девяток. Какая линия начинает добор?",
      answer: "Чек-рейз на вэлью: Kx и готовые пары хуже могут продолжить, а сет строит банк уже на флопе.",
      context: "Это тот же узел против позднего стила; меняется только позиция рейзера с BTN на CO.",
      correct: "checkraise",
      feedback: {
        fold: "Сет — верх диапазона и не сдаётся.",
        call: "Колл сохраняет блефы, но базовая учебная линия отправляет часть сетов в добор через рейз.",
        checkraise: "Верно: 99 получают продолжение от Kx и быстро строят банк."
      }
    }),
    spot({
      id: "xr-22-set", title: "K92hh · нижний сет", hand: "22", cards: ["2c", "2s"], board: ["Kh", "9d", "2h"],
      question: "Нижний сет выглядит скрыто. Оставлять 2♣2♠ только в колле или начинать добор?",
      answer: "Чек-рейз на вэлью: скрытый сет получает продолжение от Kx, 9x и подходящих дро.",
      context: "Название «нижний» не делает сет средней рукой: это всё ещё верх диапазона BB.",
      correct: "checkraise",
      feedback: {
        fold: "Сет не рассматривает пас на маленький контбет.",
        call: "Колл возможен в миксе, но учебная вэлью-линия начинает строить банк.",
        checkraise: "Верно: 22 поддерживают полублефы и добирают с готовых рук хуже."
      }
    }),
    spot({
      id: "xr-set-value", title: "Q72tt · сет как ясное вэлью", hand: "77", cards: ["7s", "7c"], board: ["Qh", "7d", "2h"], villain: "CO", bet: 1.8,
      question: "CO поставил треть банка на Q♥7♦2♥. Как строить банк с сетом?",
      answer: "Чек-рейз на вэлью: Qx и дро могут продолжить, а сильная рука защищает полублефы в той же линии.",
      context: "CO открыл, BB защитил и чекнул. Это всё ещё один и тот же BB-vs-late-RFI узел.",
      correct: "checkraise",
      feedback: {
        fold: "Сет — одна из сильнейших возможных рук.",
        call: "Колл допустим выборочно, но базовая учебная линия начинает добор уже на флопе.",
        checkraise: "Верно: сет строит банк против Qx и дро и формирует верх диапазона рейза."
      }
    }),
    spot({
      id: "call-a8-middle-pair", title: "K82r · средняя пара", hand: "A8", cards: ["Ah", "8c"], board: ["Kc", "8h", "2s"],
      question: "A♥8♣ имеет шоудаун-вэлью. Нужно ли превращать руку в чек-рейз?",
      answer: "Колл: средняя пара защищает чек-колл и не выбивает руки хуже без необходимости.",
      context: "Диапазону BB нужны не только рейзы и фолды. Руки средней силы удерживают ставочный воздух BTN.",
      correct: "call",
      feedback: {
        fold: "На треть банка средняя пара слишком сильна для немедленного паса.",
        call: "Верно: A8 реализует шоудаун-вэлью и сохраняет блефы BTN.",
        checkraise: optimisticXr("A8 лучше коллирует, сохраняет блефы BTN и не превращает шоудаун-вэлью в блеф.")
      }
    }),
    spot({
      id: "call-k7-top-pair", title: "K82r · Kx для чек-колла", hand: "K7", cards: ["Kh", "7c"], board: ["Kc", "8h", "2s"],
      question: "K♥7♣ — топ-пара, но не верх Kx. Какая линия сохраняет диапазон колла?",
      answer: "Колл. Не каждый Kx должен раздувать банк; более слабые топ-пары удерживают ставочный диапазон BTN широким.",
      context: "В примерах KQ представляет сильную вэлью-часть рейза, а K7 — естественный контроль.",
      correct: "call",
      feedback: {
        fold: "Топ-пара слишком сильна для паса на маленькую ставку.",
        call: "Верно: K7 защищает чек-колл и не изолирует себя против Kx сильнее.",
        checkraise: optimisticXr("K7 лучше защищает чек-колл и не изолируется против Kx с более сильным кикером.")
      }
    }),
    spot({
      id: "call-a2-bottom-pair", title: "K82r · нижняя пара", hand: "A2", cards: ["Ac", "2d"], board: ["Kc", "8h", "2s"],
      question: "A♣2♦ получил нижнюю пару против ставки 33%. Что лучше рейза?",
      answer: "Колл: пара с тузовым кикером имеет шоудаун-вэлью, но плохо чувствует себя против продолжения на чек-рейз.",
      context: "Сильный кандидат на рейз должен выигрывать от фолдов и иметь разумное продолжение; A2 чаще просто реализует эквити.",
      correct: "call",
      feedback: {
        fold: "Против небольшого сайза нижняя пара с тузовым кикером ещё может защищаться.",
        call: "Верно: колл сохраняет хуже и не превращает готовую руку в ненужный блеф.",
        checkraise: optimisticXr("A2 удобнее реализует пару через колл, чем получает продолжение от сильной части диапазона.")
      }
    }),
    spot({
      id: "call-66-underpair", title: "K82r · карманная пара", hand: "66", cards: ["6s", "6d"], board: ["Kc", "8h", "2s"],
      question: "Как защитить 6♠6♦ против маленького контбета BTN?",
      answer: "Колл как базовая учебная линия: у руки есть шоудаун-вэлью, но нет хорошей причины превращать её в рейз.",
      context: "Цель урока — находить пропущенные чек-рейзы и отделять базовую дисциплину от осознанного эксплойта против оверфолда.",
      correct: "call",
      feedback: {
        fold: "На треть банка карманная пара часто ещё может защититься.",
        call: "Верно: 66 сохраняют шоудаун-вэлью и ловят слишком широкие контбеты.",
        checkraise: optimisticXr("66 лучше сохраняют шоудаун-вэлью через колл, а блефовую часть проще набрать руками с живой бэкдор-эквити.")
      }
    }),
    spot({
      id: "fold-q4-air", title: "K82r · воздух без опоры", hand: "Q4", cards: ["Qc", "4d"], board: ["Kc", "8h", "2s"],
      question: "Q♣4♦ блокирует мало и почти не усиливается. Нужно ли защищать её рейзом?",
      answer: "База — пас: диапазон чек-рейза остаётся выборочным. Против явного оверфолда рейз допустим как эксплойт, но сначала выбирай воздух с более живой эквити.",
      context: "Сравни с QJ: там выше связность и два бэкдор-направления.",
      correct: "fold",
      feedback: {
        fold: "Верно: без полезных блокеров и живой эквити это нижняя часть диапазона.",
        call: "Колл без пары и хороших бэкдор-направлений плохо реализует эквити.",
        checkraise: optimisticXr("сначала рейзь более связанные руки вроде QJ, у которых есть и блокеры, и два бэкдор-направления.")
      }
    }),
    spot({
      id: "fold-j5-weak-backdoor", title: "K82r · одного намёка мало", hand: "J5s", cards: ["Jh", "5h"], board: ["Kc", "8h", "2s"],
      question: "У J♥5♥ есть раннер-раннер червы, но мало стрит-эквити. Достаточно ли этого для чек-рейза?",
      answer: "База — пас. При уверенном риде на большой оверфолд чек-рейз допустим как эксплойт, но один слабый бэкдор уступает рукам с двумя путями усиления.",
      context: "Приоритет получают сочетания нескольких причин: блокеры, эквити и связность.",
      correct: "fold",
      feedback: {
        fold: "Верно: одного слабого бэкдор-флеша недостаточно, когда есть более связанные кандидаты.",
        call: "Колл с J-хай и минимальной эквити слишком оптимистичен.",
        checkraise: optimisticXr("T9 и 97 — первые кандидаты, потому что покрывают будущие карты сразу двумя бэкдор-направлениями.")
      }
    }),
    spot({
      id: "call-a9-middle-pair", title: "K92r · средняя пара", hand: "A9", cards: ["Ah", "9c"], board: ["Ks", "9d", "2c"],
      question: "A♥9♣ попал во вторую пару. Какую ветку защищает эта рука?",
      answer: "Чек-колл: готовая рука ловит широкую ставку и не нуждается в превращении в блеф.",
      context: "Полублефы рейзят за счёт фолд-эквити и усилений; A9 уже имеет достаточную текущую ценность.",
      correct: "call",
      feedback: {
        fold: "Средняя пара слишком сильна для паса на 33% банка.",
        call: "Верно: A9 сохраняет блефы и реализует шоудаун-вэлью.",
        checkraise: optimisticXr("A9 лучше коллирует, сохраняет худшие ставки и не превращает текущую шоудаун-вэлью в блеф.")
      }
    }),
    spot({
      id: "call-k8-top-pair", title: "K92r · топ-пара слабее", hand: "K8", cards: ["Kh", "8c"], board: ["Ks", "9d", "2c"],
      question: "K♥8♣ — готовая сильная рука, но нужно ли автоматически рейзить?",
      answer: "Колл. Слабый кикер оставляет K8 в устойчивой ветке чек-колла; вэлью-рейзы начинаются выше.",
      context: "Не путай «сильная рука» и «обязательный чек-рейз».",
      correct: "call",
      feedback: {
        fold: "Топ-пара не сдаётся на маленькую ставку.",
        call: "Верно: K8 сохраняет диапазон BTN широким и контролирует банк.",
        checkraise: optimisticXr("K8 лучше остаётся в чек-колле и контролирует банк против Kx с более сильным кикером.")
      }
    }),
    spot({
      id: "fold-t8-backdoor-only", title: "K92r · не каждый бэкдор", hand: "T8", cards: ["Th", "8d"], board: ["Ks", "9d", "2c"],
      question: "T♥8♦ может собрать раннер-раннер стрит, но этого достаточно для продолжения?",
      answer: "База — пас. Против явного оверфолда чек-рейз допустим как эксплойт, но у JT уже есть гатшот, а у T8 только один далёкий раннер-раннер путь.",
      context: "Этот контроль защищает тренажёр от правила «увидел бэкдор — нажал рейз».",
      correct: "fold",
      feedback: {
        fold: "Верно: T8 уступает JT/QT/QJ по текущей эквити и качеству блокеров.",
        call: "Колл с T-хай и без готового дро слишком слаб.",
        checkraise: optimisticXr("JT/QT/QJ дисциплинированнее, потому что уже имеют гатшот и дополнительную бэкдор-ветку.")
      }
    }),
    spot({
      id: "fold-q4-k92", title: "K92r · нижний воздух", hand: "Q4", cards: ["Qd", "4s"], board: ["Ks", "9d", "2c"],
      question: "Q♦4♠ не попала и не получила готового дро. Какая дисциплинированная линия?",
      answer: "База — пас. Если BTN явно оверфолдит именно на этот сайз, чек-рейз допустим как эксплойт; без такого рида сначала выбирай связанные руки с эквити.",
      context: "Кандидаты JT/QT/QJ имеют больше эквити и лучше взаимодействуют с продолжениями BTN.",
      correct: "fold",
      feedback: {
        fold: "Верно: это естественная нижняя часть защиты BB.",
        call: "Колл без пары и дро не имеет достаточной опоры.",
        checkraise: optimisticXr("сначала используй связанные руки с гатшотом и бэкдор-эквити, а Q4 оставляй для особенно сильного рида на оверфолд.")
      }
    }),
    spot({
      id: "call-55-q72", title: "Q72tt · андерпара", hand: "55", cards: ["5s", "5d"], board: ["Qh", "7d", "2h"], villain: "CO", bet: 1.8,
      question: "5♠5♦ встретили маленький контбет CO. Нужно ли превращать пару в рейз?",
      answer: "Колл как учебная базовая линия: рука имеет шоудаун-вэлью и ловит широкую ставку CO.",
      context: "На двухмастной доске сильные дро и вэлью лучше подходят для полярного чек-рейза.",
      correct: "call",
      feedback: {
        fold: "На маленькую ставку карманная пара ещё может продолжать.",
        call: "Верно: 55 защищают чек-колл без лишней поляризации.",
        checkraise: optimisticXr("55 лучше реализуют шоудаун-вэлью через колл, а полярный чек-рейз проще строить из сетов и сильных дро.")
      }
    }),
    spot({
      id: "call-q8-q72", title: "Q72tt · топ-пара", hand: "Q8", cards: ["Qc", "8c"], board: ["Qh", "7d", "2h"], villain: "CO", bet: 1.8,
      question: "Q♣8♣ — топ-пара со средним кикером. Где ей проще реализовать ценность?",
      answer: "В чек-колле. Рука удерживает блефы CO и не обязана входить во вэлью-чек-рейз.",
      context: "Вэлью-часть рейза строится из более сильных комбинаций; диапазон колла тоже должен быть защищён.",
      correct: "call",
      feedback: {
        fold: "Топ-пара слишком сильна для паса.",
        call: "Верно: Q8 реализует шоудаун-вэлью и оставляет худшие ставки в раздаче.",
        checkraise: optimisticXr("Q8 лучше удерживает блефы CO в чек-колле; для вэлью-чек-рейза есть более сильные Qx и сеты.")
      }
    })
  ];

  const byId = new Map(practice.map((item) => [item.id, item]));

  const exactBbSummary = (cohortKey) => {
    const rows = Array.isArray(FULL_HISTORY_FIELD?.rows)
      ? FULL_HISTORY_FIELD.rows.filter((row) => row.node === "bb_response" && row.cohort === cohortKey)
      : [];
    return rows.reduce((summary, row) => ({
      opportunities: summary.opportunities + Number(row.opportunities || 0),
      folds: summary.folds + Number(row.folds || 0),
      calls: summary.calls + Number(row.calls || 0),
      raises: summary.raises + Number(row.raises || 0),
      other: summary.other + Number(row.other || 0)
    }), { opportunities: 0, folds: 0, calls: 0, raises: 0, other: 0 });
  };

  const exactRate = (made, opportunities) => opportunities >= 50 ? made / opportunities * 100 : null;
  const exactCohorts = () => [
    { key: "league1", label: "Первая лига · R1–5", ranks: "R1–5" },
    { key: "league2", label: "Вторая лига · R6–10", ranks: "R6–10" },
    { key: "league3", label: "Третья лига · R11–14", ranks: "R11–14" },
    { key: "novice", label: "Ранги 15–18", ranks: "R15–18" }
  ].map((definition) => {
    const summary = exactBbSummary(definition.key);
    const publishable = summary.opportunities >= 50;
    return {
      ...definition,
      subtitle: "BB против c-bet CO/BTN",
      display: "mix",
      sample: summary.opportunities,
      insight: publishable
        ? `${summary.raises.toLocaleString("ru-RU")} чек-рейзов из ${summary.opportunities.toLocaleString("ru-RU")} ответов BB.`
        : "Недостаточно проверенных раздач для показа частоты.",
      actions: [
        { key: "fold", label: "Пас", pct: exactRate(summary.folds, summary.opportunities), tone: "fold" },
        { key: "call", label: "Колл", pct: exactRate(summary.calls, summary.opportunities), tone: "call" },
        { key: "checkraise", label: "Чек-рейз", pct: exactRate(summary.raises, summary.opportunities), tone: "xr" }
      ]
    };
  });

  const categoryEvidence = (categoryKey, categoryLabel) => ({
    status: "methodology_only",
    categoryKey,
    categoryLabel,
    scope: "Учебная категория руки; полевая частота к ней не приписывается"
  });

  const example = ({
    sourceIds, title, handClass, categoryKey, categoryLabel, takeaway,
    baselineRole, whyThisHand, bestTurns, slowdownTurns, afterVillainContinues,
    turnPlan, controlId, controlCopy, controlShort
  }) => {
    const representatives = sourceIds.map((sourceId) => {
      const source = byId.get(sourceId);
      return {
        sourceSpotId: sourceId,
        hand: source.hand,
        title: source.title,
        boardLabel: source.title.split("·")[0].trim(),
        heroCards: source.table.heroCards,
        boardCards: source.table.boardCards
      };
    });
    const source = byId.get(sourceIds[0]);
    const control = byId.get(controlId);
    const controlAction = control.options.find((option) => option.correct);
    return {
      id: `example-${categoryKey}`,
      sourceSpotId: sourceIds[0],
      sourceSpotIds: sourceIds,
      tree: "bb_vs_late_rfi",
      title,
      handClass,
      heroCards: source.table.heroCards,
      boardCards: source.table.boardCards,
      representatives,
      playbook: {
        action: "Чек-рейз до 5,5 BB",
        baselineRole,
        whyThisHand,
        bestTurns,
        slowdownTurns,
        afterVillainContinues,
        summary: {
          why: takeaway,
          turn: turnPlan
        }
      },
      contrast: {
        sourceSpotId: controlId,
        hand: control.hand,
        heroCards: control.table.heroCards,
        boardCards: control.table.boardCards,
        actionKey: controlAction.key,
        actionLabel: controlAction.label,
        copy: controlCopy,
        shortCopy: controlShort
      },
      takeaway,
      representativeNote: "Карты показывают учебные границы категории. Этим рукам не приписывается общая полевая частота всего узла.",
      evidence: categoryEvidence(categoryKey, categoryLabel)
    };
  };

  const atlasHand = (hand, heroCards, title, reason, turnPlan) => ({
    sourceKind: "teaching",
    hand,
    heroCards,
    title,
    reason,
    turnPlan
  });

  const atlasGroup = (roleKey, roleLabel, actionLabel, hands) => ({
    sourceKind: "teaching",
    roleKey,
    roleLabel,
    actionLabel,
    hands
  });

  const atlasStructure = (key, label, boardCards, description, groups) => ({
    sourceKind: "teaching",
    key,
    label,
    boardCards,
    description,
    groups
  });

  window.FF_POKER_FIELD_LESSON_DATA = {
    schemaVersion: 1,
    key: "flop-checkraise",
    status: FULL_HISTORY_FIELD ? "ready" : "methodology_only",
    fullHistory: FULL_HISTORY_FIELD,
    meta: {
      title: "Чек-рейз флопа: BB против CO/BTN",
      kicker: "Постфлоп · защищённый BB против стила",
      lead: "BB заколлировал один опен CO/BTN, чекнул флоп и встретил c-bet. Найди руки, которые должны рейзить, не превращая в рейз весь диапазон.",
      scope: [
        "Один опен от CO или BTN и один колл BB; без лимперов и других игроков на флопе",
        "Опен не больше 3 BB, эффективный стек от 20 BB, столы на 3–9 игроков",
        "Решение начинается только после чек BB → ставка префлоп-рейзера",
        "Пас, колл и чек-рейз BB считаются в одном и том же exact response node",
        "Карточные примеры — учебные кандидаты, а не обязательное действие с каждой комбинацией"
      ],
      cohortOrder: ["league1", "league2", "league3", "novice"],
      sourceLabel: FULL_HISTORY_FIELD ? "FF · проверенные решения по раздачам" : "Полевые частоты пока скрыты",
      period: FULL_HISTORY_FIELD?.meta?.periodLabel || "На полной сверке",
      sampleNote: FULL_HISTORY_FIELD
        ? "Полевые частоты описывают сыгранные решения, а не solver-чарт. Отдельный процент показывается только при N ≥ 50; более редкие срезы скрываются. Доски и руки в примерах остаются учебными."
        : "Подходящие раздачи найдены, но полнота истории ещё проверяется. Проценты скрыты до завершения сверки."
    },
    intro: byId.get("xr-t9-backdoors"),
    wisdom: [
      {
        eyebrow: "Выбор кандидата",
        title: "Что делает блеф хорошим",
        copy: "Блокер в твоей руке уменьшает число сильных продолжений соперника. Запас усиления — шанс собрать лучшую руку. Бэкдор требует двух подходящих карт на тёрне и ривере. На K82 это помогает T9s/97s, на K92 — JT/QT/QJ.",
        rule: "Рейзь лучший из слабых рук: ищи хотя бы две причины, а не один далёкий бэкдор.",
        stat: { value: "3 фильтра", label: "блокеры · усиления · бэкдоры" }
      },
      {
        eyebrow: "Диапазон",
        title: "Рейзим не только блефы",
        copy: "На сухом K92 чек-рейзу нужна вэлью-часть: две пары, сеты и иногда сильные Kx.",
        visual: {
          type: "value-range",
          boardCards: ["Kc", "9d", "2h"],
          boardLabel: "Король-хай · сухая · K92r",
          groups: [
            {
              key: "strong",
              label: "Сильное вэлью",
              caption: "Две пары и сеты",
              hands: [
                { label: "K9", cards: ["Kh", "9c"] },
                { label: "K2", cards: ["Ks", "2d"] },
                { label: "92s", cards: ["9s", "2s"] },
                { label: "22", cards: ["2c", "2s"] },
                { label: "99", cards: ["9c", "9s"] }
              ]
            },
            {
              key: "thin",
              label: "Сильные Kx · микс",
              caption: "Выборочно, не всегда",
              hands: [
                { label: "KQ", cards: ["Kh", "Qc"] },
                { label: "KJ", cards: ["Ks", "Jh"] },
                { label: "KT", cards: ["Kd", "Tc"] }
              ]
            }
          ],
          note: "Кикеры Q, J и T блокируют часть возможных бродвейных баррелей соперника — это дополнительный аргумент иногда подмешивать эти Kx в рейз."
        }
      },
      {
        eyebrow: "Ответ BB",
        title: "Оценивай весь узел",
        copy: "Чек-рейз существует рядом с пасом и коллом. Сначала пойми, какие руки продолжают без рейза, и только потом выделяй вэлью и лучшие полублефы.",
        stat: { value: "3 действия", label: "пас · колл · чек-рейз" }
      }
    ],
    cohorts: exactCohorts(),
    examples: {
      tree: "bb_vs_late_rfi",
      title: "Кандидаты на чек-рейз",
      lead: "64 учебные руки по всем типам флопа и пять подробных разборов.",
      note: "BB против CO/BTN: колл префлоп → чек → c-bet.",
      method: "Атлас ниже — учебная стратегия, а не наблюдавшиеся раздачи поля.",
      boardAtlas: {
        sourceKind: "teaching",
        title: "8 типов флопа × 4 решения",
        lead: "На каждой доске — по две разные руки для вэлью-рейза, полублефа, чек-колла и паса.",
        scope: "BB против BTN · 40–60 BB · c-bet 25–33% банка",
        note: "Это учебная стратегия, а не наблюдение поля. Пограничные руки могут смешивать действия против другого сайза, стека или диапазона.",
        structures: [
          atlasStructure("a_high_dry", "Туз-хай · сухая", ["Ac", "7d", "2s"], "Сеты добирают, сильные пары ловят блефы, лучшие колёсные дро дают полублеф.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("77", ["7c", "7h"], "Средний сет", "Сет получает продолжение от Ax и не хочет бесплатно отдавать две улицы.", "Продолжай добор на большинстве тёрнов."),
              atlasHand("22", ["2c", "2h"], "Нижний сет", "Нижний сет всё равно далеко впереди одной пары и начинает строить банк сразу.", "Баррель бланки; на A/7 у тебя фулл-хаус.")
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз · микс", [
              atlasHand("54s", ["5c", "4c"], "Гатшот + бэкдор-флеш", "Есть прямой аут на стрит и мастевые тёрны для продолжения.", "Баррель 3 и трефы; на пустых тёрнах чаще сдавайся."),
              atlasHand("43s", ["4s", "3s"], "Гатшот + бэкдор-флеш", "Пятёрка закрывает стрит, а пики дают вторую ветку усиления.", "Продолжай на 5 и пиках, остальные карты выбирай осторожно.")
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("A5o", ["Ah", "5d"], "Топ-пара", "Рука достаточно сильна для колла и сохраняет блефы соперника.", "Лови второй баррель на безопасных тёрнах."),
              atlasHand("76s", ["7h", "6h"], "Средняя пара", "Пара семёрок имеет шоудаун-вэлью, но не хочет изолироваться рейзом.", "Чаще чек-колл небольшого сайза, переоценивай на крупных баррелях.")
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("Q8o", ["Qh", "8d"], "Воздух без дро", "Оверкарта и слабые бэкдоры не дают устойчивого продолжения.", "Сохрани фишки и выбрось сразу."),
              atlasHand("J5o", ["Jc", "5d"], "Слабый воздух", "Нет пары, готового дро или двух надёжных путей усиления.", "Пас — базовое решение.")
            ])
          ]),
          atlasStructure("k_high_dry", "Король-хай · сухая", ["Kc", "8h", "2s"], "Сильное вэлью и лучшие бэкдоры рейзят; обычные Kx и вторые пары защищают колл.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("88", ["8c", "8d"], "Средний сет", "Сет добирает с Kx и защищает полублефы в рейзе.", "Продолжай на бланках; K/8/2 дают фулл-хаус или каре."),
              atlasHand("22", ["2c", "2h"], "Нижний сет", "Даже нижний сет — естественный верх диапазона чек-рейза.", "Строй банк, пока Kx готов продолжать.")
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз · микс", [
              atlasHand("QJs", ["Qc", "Jc"], "Двойной бэкдор", "Бродвейные и трефовые тёрны дают две независимые ветки продолжения.", "Баррель T/A и трефы; на полном бланке сдавайся."),
              atlasHand("76s", ["7c", "6c"], "Связный двойной бэкдор", "Девятка или пятёрка добавляет стрит-дро, трефа — флеш-дро.", "Продолжай на 9/5 и трефах, не переигрывай одну пару.")
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("K7o", ["Kh", "7d"], "Топ-пара", "Слабый кикер лучше удерживает блефы через колл.", "Коллируй разумные баррели, но уважай крупную агрессию."),
              atlasHand("87s", ["8c", "7c"], "Вторая пара", "Шоудаун-вэлью уже есть; рейз чаще выбьет хуже и оставит сильнее.", "Реализуй через колл и переоценивай тёрн.")
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("J5o", ["Jh", "5d"], "Слабые бэкдоры", "Одной оверкарты и далёких бэкдоров мало против ставки.", "Пас без дополнительного эксплойт-рида."),
              atlasHand("Q4o", ["Qh", "4c"], "Оверкарта без плана", "Рука редко усиливается до устойчивого продолжения.", "Выбрасывай и сохраняй сильнее блеф-кандидаты.")
            ])
          ]),
          atlasStructure("broadway", "Бродвейная", ["Qc", "Jd", "4s"], "Две пары и сеты строят банк, мощные стрит-дро дают естественные полублефы.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("QJs", ["Qh", "Jh"], "Топ-две пары", "Много Qx, Jx и стрит-дро могут продолжить против рейза.", "Добирай на бланках, осторожнее на K/T/A."),
              atlasHand("44", ["4c", "4h"], "Нижний сет", "Сет хочет строить банк до опасных бродвейных тёрнов.", "Баррель бланки; спарка даёт фулл-хаус.")
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз", [
              atlasHand("KTo", ["Kh", "Tc"], "Двусторонний стрит-дро", "Восемь прямых аутов и хорошие блокеры делают рейз естественным.", "Продолжай на A/9 и подходящих бланках."),
              atlasHand("AKs", ["Ah", "Kh"], "Гатшот + две оверкарты", "Десятка закрывает натсовый стрит, а A/K иногда дают лучшую пару.", "Баррель T и сильные карты эквити.")
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("Q9o", ["Qs", "9h"], "Топ-пара", "Топ-пара со средним кикером ловит блефы и не обязана раздувать банк.", "Колл на безопасных тёрнах, осторожнее на K/T/A."),
              atlasHand("JTs", ["Jc", "Tc"], "Вторая пара + два бэкдора", "Пара уже имеет шоудаун-вэлью; девятка, король и трефа добавляют сильные дро.", "Продолжай на 9/K, трефах и против небольших сайзов.")
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("86o", ["8h", "6d"], "Воздух", "Нет пары, оверкарт или готового дро.", "Пас сразу."),
              atlasHand("95o", ["9c", "5h"], "Слабый воздух", "Далёких бэкдоров недостаточно на плотной бродвейной доске.", "Выбрасывай без специального рида.")
            ])
          ]),
          atlasStructure("low_connected", "Низкая связанная", ["8c", "7d", "5s"], "Готовые стриты и сильные дро рейзят, пары с дополнительным эквити часто продолжают коллом.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("96s", ["9h", "6h"], "Готовый стрит", "Стрит впереди пар и множества дро, которые готовы платить.", "Добирай, но учитывай закрытие флеша и спаривание доски."),
              atlasHand("64s", ["6c", "4c"], "Нижний стрит", "Готовая сильная рука должна строить банк против пар и дро.", "Продолжай на бланках, осторожнее на 9/6/4."),
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз", [
              atlasHand("T9o", ["Th", "9d"], "Двусторонний стрит-дро", "Восемь аутов и две оверкарты к части пар дают много эквити.", "Баррель J/6 и хорошие карты давления."),
              atlasHand("A6s", ["As", "6s"], "Двустороннее стрит-дро + оверкарта", "Четвёрка или девятка закрывает стрит, туз и пики добавляют запас эквити.", "Продолжай на 4/9 и пиковых тёрнах."),
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("A8o", ["Ah", "8d"], "Топ-пара", "Топ-пара сильна для паса, но рейз может изолировать против готовых стритов.", "Коллируй и переоценивай динамичные тёрны."),
              atlasHand("T7s", ["7c", "Tc"], "Вторая пара + два бэкдора", "Есть шоудаун-вэлью; девятка, шестёрка и трефа добавляют сильные дро.", "Продолжай на 9/6, трефах и против небольших сайзов."),
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("Q2o", ["Qh", "2d"], "Воздух", "Одна оверкарта без дро плохо выдерживает давление.", "Пас."),
              atlasHand("K3o", ["Kh", "3d"], "Оверкарта без связей", "У руки нет пары и готового пути к стриту.", "Выбрасывай против обычной ставки."),
            ])
          ]),
          atlasStructure("paired", "Спаренная / трипс", ["9c", "9d", "2s"], "Натсовое вэлью рейзит, средние пары часто ловят блефы, воздух выбирается очень строго.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("22", ["2c", "2h"], "Фулл-хаус", "Натсовая рука начинает добор с 9x, карманных пар и воздуха.", "Строй большой банк на любой безопасной линии."),
              atlasHand("98s", ["9h", "8h"], "Трипс", "Трипс доминирует большинство продолжений и защищает полублефы.", "Добирай, но следи за крупным ответным рейзом."),
            ]),
            atlasGroup("semi_bluff", "Полублеф / микс", "Чек-рейз · редко", [
              atlasHand("QJs", ["Qs", "Js"], "Две оверкарты + бэкдор", "Блокеры и мастевая ветка дают редкий блеф-микс, но не обязательный рейз.", "Продолжай на Q/J и пиковых тёрнах."),
              atlasHand("87s", ["8s", "7s"], "Связный двойной бэкдор", "Десятка, шестёрка и пики дают лучшие ветки продолжения.", "Баррель только карты, добавляющие сильное дро."),
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("66", ["6c", "6d"], "Две пары: девятки и шестёрки", "Карманная пара даёт две пары и хорошо ловит частые c-bet-блефы на спаренной доске.", "Коллируй разумные сайзы, сдавайся под сильное давление."),
              atlasHand("A2o", ["Ah", "2d"], "Две пары: девятки и двойки", "Попадание в двойку даёт две пары; рука не нуждается в превращении в блеф.", "Реализуй через колл и контроль банка."),
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("74o", ["7h", "4d"], "Пустая рука", "Нет пары, оверкарт или готового дро.", "Пас."),
              atlasHand("J4o", ["Jh", "4d"], "Две слабые оверкарты", "Нет пары, готового дро или хорошего плана на следующие улицы.", "Выбрасывай против ставки."),
            ])
          ]),
          atlasStructure("two_tone", "Двухмастная", ["Qh", "7h", "2c"], "Сеты и две пары добирают, сильные флеш-дро рейзят, готовые пары защищают чек-колл.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("77", ["7c", "7d"], "Средний сет", "Сет получает деньги от Qx и сильных флеш-дро.", "Добирай на бланках; на черве сохраняй шанс усилиться до фулл-хауса или каре."),
              atlasHand("Q2o", ["Qc", "2d"], "Две пары", "Две пары впереди одной Qx и могут получить продолжение от дро.", "Продолжай на бланках, осторожнее на 7 и червах."),
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз", [
              atlasHand("A5s", ["Ah", "5h"], "Натсовое флеш-дро", "Сильное дро имеет много эквити и блокирует натсовое продолжение.", "Баррель червы, A и полезные колёсные карты."),
              atlasHand("JTs", ["Jh", "Th"], "Сильное флеш-дро", "Флеш-дро уже даёт много эквити, а J/T и стритовые тёрны добавляют новые ветки.", "Продолжай на червах и картах, которые добавляют пару или стрит-дро."),
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("Q9o", ["Qs", "9d"], "Топ-пара", "Готовая пара ловит блефы, но не обязана раздувать динамичный банк.", "Коллируй и внимательно оценивай червовые тёрны."),
              atlasHand("76s", ["7s", "6s"], "Вторая пара", "Пара семёрок имеет шоудаун-вэлью и подходит для колла небольшого сайза.", "Переоценивай на крупных баррелях и закрывшихся дро."),
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("94o", ["9c", "4s"], "Воздух без червы", "Нет пары, флеш-дро или прямого стрит-дро.", "Пас."),
              atlasHand("83o", ["8d", "3c"], "Слабый воздух", "Далёкие усиления не оправдывают колл или рейз.", "Выбрасывай."),
            ])
          ]),
          atlasStructure("monotone", "Монотонная", ["As", "8s", "3s"], "Готовые флеши рейзят выборочно; пары без пики и слабый воздух чаще контролируют или сдаются.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз · микс", [
              atlasHand("KQs", ["Ks", "Qs"], "Готовый высокий флеш", "Высокий флеш добирает с меньших пик и сильных Ax.", "Строй банк, но учитывай спаривание доски."),
              atlasHand("76s", ["7s", "6s"], "Готовый флеш", "Средний флеш уже готовая сильная рука, но не обязан всегда играть на стек.", "Добирай умеренно и уважай крупный ререйз."),
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз · редко", [
              atlasHand("KQo", ["Ks", "Qh"], "Король-хай флеш-дро", "Пика закрывает сильный флеш, а король или дама иногда дают дополнительное шоудаун-вэлью.", "Продолжай на пиках и аккуратно выбирай баррели на K/Q."),
              atlasHand("54o", ["5s", "4h"], "Флеш-дро + гатшот", "Любая пика закрывает флеш, двойка — колёсный стрит.", "Баррель пики и двойку; на полном бланке чаще сдавайся."),
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("AJo", ["Ah", "Jc"], "Топ-пара без пики", "Пара тузов сильна для паса, но рейз редко получает колл от хуже.", "Контролируй банк и переоценивай большие ставки."),
              atlasHand("87o", ["8h", "7d"], "Средняя пара без пики", "Пара имеет ограниченное шоудаун-вэлью и иногда выдерживает малый сайз.", "Против крупного давления чаще сдавайся."),
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("76o", ["7h", "6d"], "Воздух без пики", "Нет пары, пики или готового дро.", "Пас."),
              atlasHand("QTo", ["Qh", "Td"], "Две оверкарты без пики", "Оверкарты плохо реализуются на трёхмастной доске без готового дро.", "Выбрасывай против ставки."),
            ])
          ]),
          atlasStructure("other", "Прочие радуги", ["Jc", "8d", "4s"], "На обычных неспаренных радужных досках баланс строится из сильного вэлью, лучших стрит-дро и защищённого колла.", [
            atlasGroup("value", "Вэлью-чек-рейз", "Чек-рейз", [
              atlasHand("88", ["8c", "8h"], "Средний сет", "Сет добирает с Jx, 8x и стрит-дро.", "Продолжай на большинстве тёрнов."),
              atlasHand("J8s", ["Jh", "8h"], "Две пары", "Две пары находятся далеко впереди одной Jx и строят банк сразу.", "Баррель бланки, осторожнее на T/9/7."),
            ]),
            atlasGroup("semi_bluff", "Полублеф / дро", "Чек-рейз", [
              atlasHand("T9s", ["Th", "9h"], "Двусторонний стрит-дро", "Восемь прямых аутов дают сильную базу для полублефа.", "Баррель Q/7 и хорошие карты давления."),
              atlasHand("76s", ["7c", "6c"], "Гатшот + бэкдор", "Пятёрка закрывает стрит, трефы добавляют вторую ветку.", "Продолжай на 5 и трефовых тёрнах."),
            ]),
            atlasGroup("check_call", "Чек-колл", "Колл", [
              atlasHand("J7o", ["Jh", "7d"], "Топ-пара", "Топ-пара со слабым кикером устойчивее играет через колл.", "Лови блефы и контролируй крупные баррели."),
              atlasHand("86o", ["8s", "6h"], "Вторая пара", "Пара восьмёрок имеет шоудаун-вэлью, но не хочет изолироваться рейзом.", "Колл небольшого сайза, переоценка тёрна."),
            ]),
            atlasGroup("fold", "Пас / воздух", "Пас", [
              atlasHand("Q2o", ["Qh", "2d"], "Оверкарта без дро", "Нет пары или готового пути к сильной руке.", "Пас."),
              atlasHand("K5o", ["Kh", "5d"], "Слабый воздух", "Одна оверкарта и далёкие бэкдоры не оправдывают продолжение.", "Выбрасывай без специального рида."),
            ])
          ])
        ]
      },
      value: [
        example({
          sourceIds: ["xr-kq-value"], title: "Сильная топ-пара", handClass: "Вэлью · верх Kx",
          categoryKey: "strong_top_pair", categoryLabel: "сильная топ-пара",
          baselineRole: "Вэлью-опора полублефов",
          whyThisHand: "K♦Q♦ находится наверху одно-парной части BB и может получить продолжение от части Kx хуже. Если всё сильное только коллирует, чек-рейз остаётся без естественной вэлью-опоры.",
          bestTurns: "K усиливает до трипса, Q — до двух пар. Чистые низкие бланки часто сохраняют второй контролируемый вэлью-баррель.",
          slowdownTurns: "A ухудшает относительную силу пары; J/T и спаривание доски усиливают часть продолжения BTN. Это не автоматический три барреля с одной парой.",
          afterVillainContinues: "На K/Q продолжай уверенно; на чистом бланке добирай умеренно. На A/J/T/спаренной доске чаще оставляй место для чека и не стекуй одну пару против резкой агрессии.",
          turnPlan: "Баррель на K, Q и бланках; осторожнее на A, J, T и спарке.",
          controlId: "call-k7-top-pair",
          controlCopy: "K7 — тоже топ-пара, но слабый кикер оставляет её в чек-колле: сохраняем блефы BTN и не изолируемся против Kx сильнее.",
          controlShort: "Слабый кикер оставляем в чек-колле.",
          takeaway: "Рейзим не любой Kx: верх топ-пар поддерживает чек-рейз, более слабые Kx защищают колл."
        }),
        example({
          sourceIds: ["xr-k9-two-pair", "xr-k2-two-pair"], title: "Две пары", handClass: "Вэлью · K9 и K2",
          categoryKey: "two_pair", categoryLabel: "две пары",
          baselineRole: "Сильное вэлью против Kx",
          whyThisHand: "K9 и K2 уже бьют любую одну пару Kx и должны строить банк, пока BTN готов продолжать с топ-парой и усилениями.",
          bestTurns: "Повтор своей ранги даёт фулл-хаус: K/9 для K9, K/2 для K2. Чистые низкие бланки сохраняют большое преимущество над одной парой.",
          slowdownTurns: "Для K2 девятка контрафитит исходные две пары; T/J/Q закрывают естественные гатшоты. Готовая сильная рука остаётся вэлью, но сайз и ответ соперника важны.",
          afterVillainContinues: "На картах фулл-хауса играй на большой банк; большинство бланков продолжай ставить. На контрафите и закрывшихся стритах внимательнее реагируй на крупный рейз.",
          turnPlan: "Продолжай на бланках; осторожнее на контрафите и закрывшихся стритах.",
          controlId: "call-k8-top-pair",
          controlCopy: "K8 — одна пара со слабым кикером. Она достаточно сильна для колла, но чек-рейз чаще выбивает хуже и получает продолжение от Kx сильнее.",
          controlShort: "Одна пара чаще остаётся в чек-колле.",
          takeaway: "Две пары начинают добор сразу; соседняя одна пара сохраняет устойчивый чек-колл."
        }),
        example({
          sourceIds: ["xr-set-value", "xr-22-set", "xr-99-set"], title: "Сеты", handClass: "Вэлью · 77, 22 и 99",
          categoryKey: "set", categoryLabel: "сет",
          baselineRole: "Верх диапазона на сухой и двухмастной доске",
          whyThisHand: "Сет быстро получает деньги от топ-пары, второй пары и дро. На Q72tt 77 дополнительно строит банк до того, как ранаут остановит Qx или закроет дро.",
          bestTurns: "Повтор ранга сета даёт каре; спаривание другой карты доски — фулл-хаус. Большинство неспаренных бланков всё ещё оставляют сет очень сильной рукой.",
          slowdownTurns: "T/J/Q закрывают часть гатшотов на K92; черва завершает фронтдорный флеш на Q72tt и в варианте 22 на K92hh. Это карты внимания, а не автоматический пас.",
          afterVillainContinues: "На спаренной доске играй на стек; на чистых бланках продолжай добор. Когда закрывается очевидное дро, уменьшай сайз или проверяй ответ соперника, сохраняя редро к фулл-хаусу.",
          turnPlan: "Спокойно добирай, пока не получишь рейз.",
          controlId: "call-55-q72",
          controlCopy: "55 на Q72tt — готовая андерпара для колла. Шоудаун-вэлью есть, но полярный чек-рейз лучше строить из сетов и сильных дро.",
          controlShort: "Есть шоудаун-вэлью, но для рейза лучше сет или сильное дро.",
          takeaway: "Сильные руки не нужно слоуплеить: оппоненты чаще слишком пассивны, чтобы рассчитывать на их ставки. Блеф-кетчить можно с более слабыми руками — например, A9 или K3."
        })
      ],
      bluff: [
        example({
          sourceIds: ["xr-t9-backdoors", "xr-97-double-backdoor"], title: "Двойной бэкдор", handClass: "Полублеф · T9s и 97s",
          categoryKey: "double_backdoor", categoryLabel: "два бэкдор-пути",
          baselineRole: "Лучший связный воздух",
          whyThisHand: "T♥9♥ и 9♥7♥ не имеют готового дро, но объединяют бэкдор-стрит и бэкдор-флеш. Это осмысленный нижний край чек-рейза, а не лицензия рейзить любые две карты.",
          bestTurns: "T9: J/7 создают двустороннее стрит-дро; 97: T/6. Любая черва включает флеш-дро. В учебной линии T9 карта J♥ ведёт к ставке 10 BB, а Q♥ на ривере — к пушу 24,5 BB.",
          slowdownTurns: "Спаривание K/8/2 укрепляет продолжение BTN; сухие оверкарты почти не добавляют эквити. Попадание в T/9/7 чаще переводит руку в контроль шоудаун-вэлью.",
          afterVillainContinues: "Баррель лучшие стритовые и червовые карты; промежуточные гатшоты продолжай выборочно. На полном бланке спокойно завершай блеф вместо обязательного второго барреля.",
          turnPlan: "Баррель на картах стрита и своей масти; на бланке сдавайся.",
          controlId: "fold-j5-weak-backdoor",
          controlCopy: "J♥5♥ имеет только один слабый бэкдор. База — пас. При уверенном риде на сильный оверфолд чек-рейз допустим как эксплойт, но T9/97 дисциплинированнее: у них два пути усиления.",
          controlShort: "Только один слабый бэкдор — базово пас.",
          takeaway: "Оверфолд позволяет расшириться, но базовый порядок кандидатов сохраняется: сначала руки с двумя независимыми путями усиления."
        }),
        example({
          sourceIds: ["xr-jt-gutshot", "xr-qt-gutshot", "xr-qj-gutshot"], title: "Гатшот + бэкдор", handClass: "Полублеф · JT, QT и QJ",
          categoryKey: "gutshot_plus", categoryLabel: "гатшот + бэкдор",
          baselineRole: "Готовая эквити и полезные блокеры",
          whyThisHand: "У всех трёх рук уже есть прямой аут на стрит и мастевая бэкдор-ветка. QJ дополнительно убирает часть KQ/KJ из сильного продолжения BTN.",
          bestTurns: "JT закрывает стрит на Q, QT — на J, QJ — на T. Мастевая карта включает флеш-дро; для JT восьмёрка также создаёт двустороннее стрит-дро.",
          slowdownTurns: "Спаривание K/9/2 усиливает часть диапазона колла; сухие низкие бланки почти не добавляют эквити. Q/J/T, давшие пару, чаще переводят полублеф в контроль.",
          afterVillainContinues: "На стритовой карте переходи к вэлью, на мастевых картах продолжай полублеф. На паре чаще реализуй шоудаун-вэлью, на пустой карте разреши себе сдаться.",
          turnPlan: "Баррель на стритовых и мастевых картах; пару чаще играй через чек.",
          controlId: "fold-t8-backdoor-only",
          controlCopy: "T8 имеет только один раннер-раннер путь к стриту. База — пас; против явного оверфолда чек-рейз допустим как эксплойт, но JT/QT/QJ дисциплинированнее благодаря готовому гатшоту и бэкдор-ветке.",
          controlShort: "Готового дро нет — базово пас.",
          takeaway: "Эксплойт может расширить чек-рейз, но готовый гатшот даёт намного надёжнее план после колла, чем один далёкий раннер-раннер путь."
        })
      ]
    },
    practice,
    practiceGenerator: {
      schemaVersion: 1,
      global: "FFFlopCheckraisePracticeGenerator",
      defaultDepth: "flop"
    },
    practicePresentation: {
      autoStart: true,
      compactFeedback: true,
      externalControls: true
    }
  };
})();
