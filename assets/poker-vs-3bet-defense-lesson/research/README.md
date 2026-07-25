# Защита против 3-бета: источник полевых срезов

## Строгий узел

Урок использует только решения после собственного RFI:

`Hero RFI → соперник 3-bet → Hero fold / call / 4-bet`.

Широкий `face_3bet` не подходит: в ClickHouse за 2025-07-15…2026-07-14
точный узел после RFI дал `N=20 527 140` и mix `57.24 / 31.01 / 11.74%`,
а другие face-3bet ситуации дали `N=31 853 659` и `93.77%` fold.

## Измеренный hand-level куб · основной полевой слой

Новый экран «Как играет поле» строится из строгого lossless-куба за окно
`[2026-01-01 00:00:00, 2026-07-17 00:00:00)` UTC. Последняя фактическая
раздача в выгрузке — `2026-07-16 09:03:47`.

Строгий фильтр ClickHouse:

- `is_rfi=1`, `is_preflop_face_3bet=1`, `is_preflop_could_4bet=1`;
- `is_face_squeeze=0`: cold caller и squeeze-узел исключены;
- ответ против 3-бета только `F/C/R`;
- Hero EP/MP/HJ/CO/BTN/SB, валидная позиция 3-беттора и допустимый порядок действий;
- эффективный стек от 20 BB;
- абсолютный размер 3-бета от 3 BB;
- latest-версия каждой `hand_player_id` через `argMax`.

Чтобы уложиться в лимит ClickHouse, бизнес-предикаты применяются до `argMax`.
На этом замороженном окне отдельный контроль не нашёл расхождений между
полным latest-first и latest-qualifying для точного RFI/face-3bet узла. Перед
расширением окна этот контроль нужно повторить.

Ранг присоединён на точный `played_at` из half-open интервалов
`mcp__check_rank_history`; используются только real players. Когорты не
пересекаются: R16–18, R11–15, R6–10, R1–5.

Гранулярность CSV:

`cohort × Hero position × 3bettor position × IP/OOP × stack band × 3bet-to bucket × 169 hand × action counts`.

Fold/call берутся из `preflop_face_3bet_action`; прямой 4-бет-пуш — только
`preflop_action='RR' AND is_preflop_allin=1`; остальные ответы `R` — 4-бет.
Решения с неизвестными картами входят в безопасные агрегаты среза, но не в
hand-level клетки. Публичный chart total считается по всем исходным решениям и
не зависит от privacy threshold. Для известной руки при N≥20 публикуются точные
счётчики; при 0<N<20 исходные N/счётчики скрыты, а UI получает явно помеченную
Dirichlet-сглаженную оценку с prior 16 рук из остальных когорт того же спота.

Итог выгрузки:

- 109 449 строк в приватном lossless build-input, без duplicate keys и `other` actions;
- 5 051 115 решений: 2 948 669 пасов, 1 429 754 колла, 281 440 обычных
  4-бетов и 391 252 прямых 4-бет-пуша;
- 4 395 871 решение с известной рукой, coverage 87,028%;
- R16–18 N=40 938; League 3 N=2 483 604; League 2 N=1 853 956;
  League 1 N=672 617;
- default League 3 / BTN / IP / 31–50 BB / all sizes: N=116 868 решений,
  из них 101 463 с известной рукой; все 169 рук заполнены точно.

Порог UI: 0<N<20 — помеченная оценка без сырого N; N 20–79 — малая точная
выборка; N≥200 — сильная. Два точных среза R16–18
(`EP / IP / 20–30 BB / 8–10` и `10+`) не имеют ни одного наблюдения. Ещё 20
срезов с общим N<20 целиком скрыты по privacy policy. Никакой другой чарт вместо
них не подставляется; рука с нулём исходных наблюдений не импутируется.

### Честная граница размера

Экран показывает **абсолютный 3-бет до** `<6 / 6–8 / 8–10 / 10+ BB`.
Множитель 3-бета не строится: `preflop_2bet_and_blind_facing_amount_bb` на
Hero-row — сумма, которую Hero видел до собственного RFI, а не размер RFI.
Восстанавливать множитель из этого поля нельзя. Для него нужен отдельный
action-history либо join к строке 3-беттора.

### Файлы и provenance

- внешний приватный build-input с 6 542 rank intervals; CSV с `user_id` не
  хранится в публичном каталоге урока и не попадает в deploy;
- внешний приватный lossless observed cube; timestamped CSV не хранится в
  публичном каталоге урока и не попадает в deploy;
- `data/vs3bet-field-data.js` — count-pooled browser payload;
- `data/vs3bet-field-diagnostics.json` — totals, coverage, sparsity, hashes;
- `tools/vs3bet-field-cube.sql` — BigQuery bridge + ClickHouse query;
- `tools/render-vs3bet-field-query.mjs` — deterministic placeholder renderer;
- `tools/build-vs3bet-field-data.mjs` — deterministic CSV build;
- `tools/test-field-data.mjs` — query/data/browser contract.

Jobs and hashes:

- rank bridge: `mcp_bq_7ec39be98a71484d8c845ba5df7ac2b9`, SHA-256
  `2c2222910fd1b44e7b56d060244e11487ee96f6f0484cc57ba9b90ffafb5fc64`;
- hand cube: `mcp_ch_job_1dc4dcea6c5644578ddb72c9f90a32f2`, SHA-256
  `93d53426b9b9017a4362f36db96a41e39226c053439936c5ec814346f96b7329`;
- source-query template SHA-256:
  `a36f7957cd14b5838d829c6d0b17944da3aaa44f0ad896c39ad6deb863196717`;
- independent monthly-snapshot position control:
  `mcp_bq_ade4e7953ae9414799234d2051d1abc9`.

Rebuild after refreshing both CSV inputs. Rank bridge must remain outside the
public lesson tree; the builder validates its frozen row count and SHA-256 when
the external path is supplied:

```sh
node assets/poker-vs-3bet-defense-lesson/tools/render-vs3bet-field-query.mjs \
  /private/tmp/vs3bet-rank-intervals-20260717.csv
node assets/poker-vs-3bet-defense-lesson/tools/build-vs3bet-field-data.mjs \
  --cube /private/tmp/vs3bet-field-hand-cube-nosqueeze-memorysafe-20260717.csv \
  --cube-job-id mcp_ch_job_REPLACE_ME \
  --rank-intervals /private/tmp/vs3bet-rank-intervals-20260717.csv
node assets/poker-vs-3bet-defense-lesson/tools/test-field-data.mjs
```

The observed cube is descriptive. It never changes the correct practice action;
practice remains graded from the methodology/reference layer.

## Годовой агрегат-контроль

- Source: `analytics_mcp_readonly.mcp__fflk_player_tracker_stats`.
- Period: monthly snapshots 2025-08-01…2026-07-01; July 2026 is partial.
- Rank: as of the start of each month via `mcp__check_rank_history`.
- Denominator: `cases_fold_3bet_total = cases_4bet_total`.
- Call is reconstructed as `opportunities - folds - fourbets`.
- Aggregation is opportunity-weighted, not an average of player percentages.

| Cohort | N | Players | Fold | Call | 4-bet |
| --- | ---: | ---: | ---: | ---: | ---: |
| League 1, R1–5 | 1,017,333 | 222 | 53.82% | 29.88% | 16.30% |
| League 2, R6–10 | 2,469,549 | 631 | 56.18% | 29.00% | 14.82% |
| League 3, R11–17 | 3,071,114 | 1,381 | 59.96% | 28.49% | 11.55% |
| R15–17 | 861,445 | 953 | 59.39% | 30.14% | 10.47% |

Jobs:

- main cohorts: `mcp_bq_80039683391746b3bc0cda01a00f1260`;
- pooled R15–17: `mcp_bq_b5cd549cc8d049f299aff3134e7e93ca`;
- denominator check: `mcp_bq_72cd109a0b0f4531a914636415e43874`;
- rank coverage: `mcp_bq_beb917a589eb499db4f0e06ba1ce7ccb`;
- stable full-month sensitivity: `mcp_bq_800bf15153434af198b894488a748d8e`.

Rank-at-month-start covers 6.558M of 6.663M recent opportunities (98.4%).
The stable-rank full-month sensitivity differs by less than about one percentage
point. Players can appear in several cohorts after rank changes.

R15 supplies 99.0% of the pooled R15–17 denominator. R16 and R17 exist in this
source only in partial July 2026, so this row is not a balanced comparison of
three ranks and must not be used to infer progression.

## Existing teaching material used

- `docs/methodics-15-11.md`: position, sizing and stack adjustments; teaching
  control `65 / 25 / 10`, kept separate from observed field frequencies.
- Supplied methodology PDF: page 7 has the exact EP/MP/HJ/CO/BTN
  RFI-vs-3-bet matrices; page 12 has the exact SB-vs-BB matrix; page 15
  compares defense against 2.5x / 3x / 4x in one CO-vs-BTN example.
- `assets/poker-vs-3bet/data.lazy.json`: 208 combined tasks, including 59
  defense tasks (23 fold / 27 call / 9 4-bet). All 59 use 58 BB and the same
  `Hero 2 BB → 3-bet 8 BB` line, so the new practice deliberately adds other
  stacks and sizes.

The field mix is descriptive. It is not an optimal chart and does not identify
the EV of an individual fold, call or 4-bet. `chips_ev` was not used as a
counterfactual action value.

Этот monthly snapshot остаётся параллельной проверкой общего уровня и
позиционных сумм. Он не заменяет строгий hand-level cube: окна, rank assignment,
stack/size filters и форма хранения различаются, поэтому цифры не обязаны
совпадать до десятой.

## Контроль целевой стратегии после опена

Целевой экран на вкладке «Главное» отвечает на условный вопрос: **что делать с
уже открытым диапазоном после полученного 3-бета**. Частота RFI конкретной руки
задаёт вес этой руки внутри уже открытого диапазона. Поэтому сводка EP–BTN
считается один раз по точным hand-level матрицам:

`Σ(комбинации руки × частота RFI × частота действия) /
 Σ(комбинации руки × частота RFI)`.

Ошибка была не в этой нормировке. После неё общий `scenario()` дополнительно
переносил до 60% фолдов пограничных рук в колл для обычного 3x, а IP и глубокий
стек расширяли колл ещё раз. В результате корректные 55–68% паса превращались
в 23–30%. Для базового узла `80+ BB / 3x` эти эвристические переносы удалены:
сводка теперь буквально агрегирует точную матрицу.

| Позиция | Частота RFI диапазона | Пас | Колл | 4-бет | Пуш |
| --- | ---: | ---: | ---: | ---: | ---: |
| EP | 19,1% | 62,37% | 24,20% | 13,43% | 0% |
| MP | 25,8% | 64,97% | 24,21% | 10,82% | 0% |
| HJ | 31,2% | 54,94% | 32,51% | 12,55% | 0% |
| CO | 46,2% | 61,42% | 30,09% | 8,49% | 0% |
| BTN | 68,9% | 67,79% | 24,76% | 7,45% | 0% |
| SB vs BB | отдельная матрица | 65,00% | 27,00% | 8,00% | 0% |

Экономическая красная линия остаётся отдельной диагностикой, а не потолком
целевого паса. Она отвечает только на вопрос, когда чистый 3-бет-блеф без
эквити уже получает немедленную прибыль:

При RFI 2 BB, уже поставленном BB 1 BB и банке 4,5 BB до 3-бета:

| Размер 3-бета | Риск 3-беттора | Порог авто-прибыли |
| --- | ---: | ---: |
| 2,5x до 5 BB | 4 BB | 47,06% |
| 3x до 6 BB | 5 BB | 52,63% |
| 4x до 8 BB | 7 BB | 60,87% |

Это **не наблюдаемая частота поля** и не обещание точного solver optimum.
Целевая стратегия может иметь пас выше этой линии: сильный диапазон опена и
ценность продолжения отдельных рук нельзя заменить одной MDF-формулой.

### Прозрачная адаптация остальных фильтров

В источнике нет полного точного куба `позиция × стек × размер`. Поэтому
варианты вокруг базового `80+ BB / 3x` меняются только явно перечисленными
переносами:

- 2,5x: 8% базового паса переносится в колл;
- 3x: базовая точная матрица без переноса;
- 4x: 20% колла переносится в пас, затем 5% оставшегося колла — в 4-бет;
- 20–30 BB: 12% колла переносится в пас, 72% обычного 4-бета — в пуш;
- 31–50 BB: 4% колла переносится в пас, 28% обычного 4-бета — в пуш;
- 51–80 BB и 80+ BB: без дополнительного переноса.

### Независимая проверка порядка величин · 2026-07-25

Дополнительно выполнен строгий ClickHouse-контроль узла
`Hero RFI → первый non-squeeze 3-bet → решение Hero` за
`2026-01-01…2026-07-25`, все ранги. Он не используется как рекомендация, но
проверяет, что целевой экран не показывает физически неправдоподобный порядок
величин:

| Позиция | N | Пас | Колл | 4-бет | 4-бет пуш |
| --- | ---: | ---: | ---: | ---: | ---: |
| EP | 414 431 | 50,0% | 34,1% | 6,8% | 9,0% |
| MP | 1 599 165 | 53,6% | 31,7% | 6,3% | 8,3% |
| HJ | 1 111 311 | 55,3% | 30,4% | 6,2% | 8,1% |
| CO | 1 143 180 | 60,2% | 27,0% | 5,6% | 7,3% |
| BTN | 1 102 900 | 67,7% | 21,9% | 4,1% | 6,2% |
| SB | 225 684 | 65,2% | 21,8% | 3,8% | 9,2% |

Таким образом, полевые решения остаются на отдельной вкладке и не подменяют
нашу стратегию, но контроль подтверждает: 23–30% паса в общем целевом плане
были следствием повторной эвристической деформации уже корректно
нормированного диапазона, а не реалистичной стратегией игроков.

## Что в чарте является точным, а что моделью

Базовый слой «Методичка» переносит клетки и частоты из исходных матриц
страниц 7 и 12. Это единственный hand-level слой, который показывается как
дословный источник.

В PDF нет полного куба `позиция × IP/OOP × стек × размер 3-бета`, поэтому
остальные фильтры являются учебной адаптацией:

- 2.5x немного расширяет продолжение;
- 3x сохраняет точную базовую матрицу;
- 4x сужает call и переносит небольшую часть продолжений в 4-bet;
- 20–30 BB сокращает спекулятивные коллы и отделяет 4-bet jam;
- 51–80 BB и 80+ BB не получают отдельного массового расширения;
- OOP сужает пограничный call относительно IP.

Эти поправки помечаются в интерфейсе как модель, а не как новая страница
методички или solver-решение.

Слои League 1 / 2 / 3 / «Новички» также не являются измеренными hand-level
чартами. Они показывают учебную модель состава диапазона, откалиброванную к
опубликованным агрегатам fold / call / 4-bet выше. «Новички» используют
наблюдаемый срез R15–17, который на 99% состоит из R15; это ограничение
показывается рядом с чартом.
