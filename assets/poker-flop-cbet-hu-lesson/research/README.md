# C-bet IP против BB: границы источников

Строгий спот урока:

`Hero unopened RFI → BB is the only caller → HU SRP → BB checks flop → Hero IP decision`.

Donk pots, limped pots, SB-vs-BB, multiway, 3-bet pots и другие
последовательности исключены. Check-raise считается только как
`BB check → Hero non-all-in c-bet → BB raise`.

## Текущий статус публикации

Browser payload работает в `methodology_only`. В `data.js` нет частот
поля, таблиц по доскам или приписанных рукам процентов. Это
намеренный fail-close, а не отсутствие нулевой частоты.

Для публикации нужен один завершённый артефакт с проверенным
манифестом. Счётчики складываются до расчёта процентов;
частоты между шардами не усредняются. Единый порог публикации —
`N >= 50`: `N=49` скрыт, `N=50` можно показать. Smoothing,
интерполяция и подстановка нулей за неизвестные срезы запрещены.

## 1. All-history availability probe

`all-history-candidate-probe.sql` считает по месяцам только distinct
candidate keys в `analytics.int_tracker_hand_joined`. Результат сохранён в
`all-history-candidate-counts-by-month.csv`.

Этот probe доказывает только то, что candidate keys есть в более
длинном историческом окне. Он не доказывает:

- наличие raw HH для каждого key;
- latest-version семантику по `hand_player_id`;
- покрытие exact rank-at-hand;
- парсинг позиций, доски, сайзингов и последовательности действ;
- готовность browser asset.

Поэтому ни candidate totals, ни период probe не показываются
ученику как «полная история».

## 2. Точный Q2 raw-HH cube

`q2-all-residue-extract.sql` задаёт воспроизводимый raw-HH extract для
`[2026-04-01, 2026-07-01)`. Только объединение всех 200 непересекающихся
residue может претендовать на 100% candidate manifest. Каждый raw HH
выбирается latest-first по его source key и `created_at`, после чего offline
parser проверяет exact action sequence и rank на timestamp раздачи.

Текущий Q2 rebuild не завершён. В репозитории нет манифеста,
который доказывает полноту всех residue, и нет актуального merged
cube. Более ранний 70% Q2 snapshot и его агрегаты не являются
текущим источником и не загружаются в browser.

## 3. Exact latest-first field cube

`full-history-postflop-field-cube.sql` — отдельный hand-level mart cube, а не
raw-HH extract. Он может дать точные агрегаты действ по позиции и
стеку, но не заменяет raw HH для доски, точной руки и сайзинга.

Негационируемый порядок:

1. выбрать latest row по `hand_player_id` до poker/business filters;
2. привязать exact rank-at-hand по half-open интервалу;
3. применить строгое дерево спота;
4. сложить additive counts и проверить action identities;
5. применить `N >= 50` после merge;
6. только затем inject один и тот же артефакт в c-bet и
   check-raise уроки.

Подробный статус и доказательства лежат в
`full-history-postflop-provenance.md`. Пока манифест и merged artifact не
готовы, этот cube тоже не публикуется.

## Граница интерпретации

- Наблюдаемая частота поля не является solver target или causal
  proof.
- Доски и руки в методическом атласе не получают overall field
  rate.
- Если источник, манифест, action sum, rank timing или denominator
  не проходят контракт, UI показывает методику без процентов.
