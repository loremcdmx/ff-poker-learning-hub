# Наблюдаемые данные для урока «Рестил 25–40 BB»

Эти файлы описывают фактическое поведение поля FunFarm. Они помогают показать,
как разные типы опенеров открываются и отвечают на рестил, но **не задают
правильный ответ и не участвуют в грейдинге практики**. Рекомендация тренажёра
остаётся отдельной моделью.

## Публичные файлы

| Файл | Содержание | Окно |
|---|---|---|
| `field_opens.json` | Наблюдаемые чистые опены CO/BTN по типу игрока и стеку | 2026-01-01..2026-07-01, шесть месячных партиций |
| `field_vs_jam.json` | Fold/continue **первоначального CO/BTN опенера** после прямого all-in Hero из SB/BB | 2026-01-01..2026-07-17 (правая граница не включена) |
| `field_call_range.json` | Известные карты, с которыми тот же первоначальный опенер продолжил | то же окно |
| `field-opener-response.json` | Проверяемый агрегированный куб исходной строгой выгрузки и provenance-контролы | то же окно |
| `field-exact-bb-btn-2bb.json` | Компактный runtime-срез: Hero BB против BTN 2 BB, стек 25–40 BB | то же окно |
| `browser-bundle.js` | File-safe bundle, которым пользуется страница урока | собирается из JSON выше |

Сырой CSV из MCP в репозиторий не публикуется.

## Что исправлено строгой выборкой

Старый `field_call_range` объединял всех игроков, которые продолжили против
джема Hero: только 77,6% строк принадлежали первоначальному опенеру, 18,3% —
холодному коллу BB после джема Hero из SB, ещё 4,1% — другим местам. Старый
`field_vs_jam` вдобавок использовал широкий прокси «3-бет размером 22–45 BB».

Текущие `field_vs_jam` и `field_call_range` строятся одним строгим запросом
`../tools/04_strict_opener_response.sql`:

- сначала выбирается последняя версия каждой строки, затем применяются фильтры;
- Hero находится в SB/BB, может 3-бетить и делает прямой all-in против первого
  агрессора CO/BTN; лимперов нет, опен 2/2,5/3 BB, эффективный стек 25–40 BB;
- раздача связывается по `tourney_id + hand_id + month_start_date`, а физическое
  решение Hero — по `hero_hand_player_id`;
- в `stg_tracker__hand_stats` выбирается ровно место первоначального опенера;
- холодные коллы и ответы остальных игроков не попадают в датасет;
- player/category/holecard-справочники дедуплицируются до джойна.

## Provenance и reconciliation

- MCP jobs: `mcp_ch_job_6f22066cf0bc448cb3ca497d35bf8ef1`,
  `mcp_ch_job_c64d7ba1bba04e7090c14bed6c416acd`,
  `mcp_ch_job_846621e3173649a38113e3308c2de997`
- Combined source manifest SHA-256:
  `fd79dbed55c33e96b3977d6ed4d2aaea510207c9a9703d184c57110c27394507`
- SQL template SHA-256:
  `5a4aeb95ad7e390839eaa2b9ea78d4c10c523a5c1359948c9732b45100713b4f`
- Rendered shard query SHA-256: `bd1e8e8ea8b864f21c03659be6d78df82175f81ff0829c6662181f8bbf07d6ec`,
  `2a24aa4b175ad10dffcfad66a218a3dd812475bdf61d0b5d60fb8272995d9742`,
  `695823a3f2a911127939c9995c9998c97ace5363ea21fbfd60fb326a9a95420a`
- Hero direct jams: `179 341`
- Candidate opener-response rows before the 1:1 guard: `128 718`
- Hero jams with at least one candidate response: `128 688`
- Ambiguous Hero jams excluded from frequencies: `30` (`0,0167%`)
- Max candidate responses before exclusion: `2`
- Matched original-opener responses: `128 658`
- Match coverage: `71,7393%`
- Matched unique Hero jams: `128 658`
- Max opener responses per Hero jam in the published strict slice: `1`
- Known continuing hole cards: `36 553`

| Окно | CSV SHA-256 | Строк |
|---|---|---:|
| 2026-01-01..2026-04-01 | `1a7ccb17d76bee2e230778becdfb1f50d1bdaffe5b32dbf342d313578160ae19` | 9 064 |
| 2026-04-01..2026-06-01 | `3f549ed9d044be22ee6c8a9552a7e5aabca065f882b65da1fb68eec9c5f8b1b8` | 7 065 |
| 2026-06-01..2026-07-17 | `4d7a932338fff6a60dcfd05fa5616b3e6cf920edbd203dc1ee47b98ac75d5bdc` | 5 415 |

Сборщик `../tools/build-strict-opener-response.mjs` fail-closed проверяет:

1. `response_count = unique_hands` в каждой выгруженной ячейке;
2. согласованность candidate totals до применения 1:1 guard;
3. исключение всех Hero jams с двумя и более кандидатами исходного опенера;
4. `matched responses = matched unique jams` и `max responses = 1` уже в
   публикуемом строгом срезе;
5. долю неоднозначных матчей не выше 1% и покрытие исходного опенера 50–100%.

Нематчившиеся и неоднозначные джемы не считаются фолдами и не входят в
знаменатель частот.

## Определения

`fold_pct` и `continue_pct` — доли в `[0,1]`. Continue включает `C` (колл)
и `R` (cover-and-reraise/изоляция), когда первоначальный опенер продолжил после
all-in Hero.

Категории берутся из `tracker_united_player_cats` с приоритетом:
`good_reg → mid_reg → weak_reg → nit → aggro_fish → passive_fish →
semipassive_fish → aggro_sticky → aggro_foldy → unknown`.

Карты неизвестного шоудауна остаются в `n_total` как `unknown_holecards`, но не
входят в `n_known_holecards`. Если у отдельной категории меньше 500 известных
продолжений, интерфейс использует объединённую reg/fish-группу.

`field_opens.json` остаётся отдельной широкой витриной возможностей чистого
опена: CO/BTN, 3–9 max, unopened pot, собственный стек опенера в бенде,
`open_clean_pct` для размеров до 3 BB. В 25–40 BB там 15 166 493 возможности.

## Ограничения интерпретации

- Это условные частоты после **реально сделанных Hero-джемов**. Они отражают
  выбор спотов игроками проекта и не являются solver target.
- Категория оппонента берётся из текущего типизатора, а не исторического среза
  ровно на момент раздачи.
- Часть джемов не имеет однозначной строки исходного опенера в hand-stats;
  поэтому в UI всегда показывается фактический `N`, а пропуски не импутируются.
- Малые hand-клетки шумные; для портрета диапазона важнее pooled/super-group,
  чем отдельная редкая комбинация.

## Пересборка

1. Выполнить `../tools/04_strict_opener_response.sql` через FunFarm MCP с
   `async=true`, `format=csv_file`. Для тяжёлого полного окна допустимо разбить
   запрос на смежные непересекающиеся шарды, одинаково меняя границы
   `played_at` и обеих месячных партиций.
2. Скачать CSV вне репозитория и составить manifest с `path`, `jobId`,
   `windowStart`, `windowEnd` для каждого шарда.
3. Собрать и проверить данные:

   ```bash
   node assets/poker-resteal-lesson/tools/build-strict-opener-response.mjs \
     --manifest /private/tmp/ff-resteal-strict-opener-response-manifest.json \
     --data-dir assets/poker-resteal-lesson/data
   node assets/poker-resteal-lesson/tools/test-strict-opener-response.mjs
   node assets/poker-resteal-lesson/tools/build-exact-bb-btn-response.mjs
   node assets/poker-resteal-lesson/tools/build-browser-bundle.mjs
   node assets/poker-resteal-lesson/tools/test-presets.mjs
   ```

4. Обновить hash cache-token `data/browser-bundle.js` в `resteal-lesson.html`.
