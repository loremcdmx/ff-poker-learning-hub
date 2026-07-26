# Чек-рейз BB против CO/BTN: границы источников

Урок и тренажёр используют один узел:

`CO/BTN RFI → BB call → HU flop → BB check → aggressor c-bet → BB response`.

Cold-call pots, 3-bet pots, limpers и multiway в этот урок не входят.
Пас, колл и check-raise BB считаются в одном exact response denominator;
отдельные denominator для каждой кнопки запрещены.

## Текущий статус пубикации

Browser payload работает в `methodology_only`. Полевая матрица и
наблюдаемые руки скрыты. Учебный атлас остаётся доступен, но
его рукам не приписываются field rates.

Единый publication floor — `N >= 50`. Процент считается только как
exact numerator / exact shared denominator после additive merge. `N=49`
скрыт, `N=50` можно показать. Smoothing, интерполяция и нули
вместо неизвестной частоты запрещены.

## Канонический exact node

Полевой cube должен сохранять:

- 3–9 max;
- Hero на BB;
- один unopened RFI от CO или BTN, без лимперов;
- open `1.5–3.0 BB`;
- effective stack не меньше `20 BB`;
- BB коллирует, на флопе остаются два игрока;
- BB чекает и встречает c-bet;
- response разложен на ровно одно из трёх действ: fold, call,
  raise. Любой `other` блокирует публикацию.

Ранг берётся на timestamp раздачи. Группы не пересекаются:
League 1 `R1–5`, League 2 `R6–10`, League 3 `R11–14`, newcomers `R15–18`.

## 1. All-history availability probe

Общий с c-bet уроком `all-history-candidate-probe.sql` считает только
candidate keys у близкого RFI-vs-BB узла. Он не проверяет raw-HH
coverage, exact BB response, rank-at-hand или latest-version семантику.
Поэтому это availability evidence, а не источник процентов check-raise.

## 2. Точный Q2 raw-HH cube

Доска, сайзинги и response aggressor после check-raise требуют raw HH.
Воспроизводимое окно этого pipeline — `[2026-04-01, 2026-07-01)`.
`q2-all-residue-extract.sql` выдаёт 200 непересекающихся residue. Только их
полная текущая сборка, один candidate manifest и один parser pass могут
дать Q2 cube.

Текущий rebuild не завершён. Старые `structure-league-field-matrix.csv`,
`size-matched-k-high-dry-folds.csv` и Q2 HH examples не являются browser
source. Их нельзя смешивать с частичными шардами текущей выгрузки.
Builder должен создать общую structure matrix и size-matched card в одном
проходе, с четырьмя непересекающимися группами до `R18`.

## 3. Exact latest-first field cube

Частоту всего ответа BB можно строить из
`analytics.int_tracker_hand_joined`, но это hand-level mart, а не raw HH.
`full-history-postflop-field-cube.sql` обязан:

1. сначала выбрать latest row по `hand_player_id`;
2. потом привязать exact rank-at-hand;
3. только после этого применить poker/business filters;
4. доказать `folds + calls + raises + other = opportunities`;
5. отклонить артефакт, если `other != 0`;
6. применить `N >= 50` только после additive merge.

Этот cube пока не собран в валидированный browser artifact. До тех пор
UI не показывает ни общие частоты, ни разницы между лигами.

## Учебные руки и сайзинг

Карточные примеры и практика — методическая модель. Они не являются
доказательством, что конкретная рука рейзит с конкретной частотой.
Пример c-bet `25–33%` и check-raise-to около банка — учебный сайзинг,
а не полевая target frequency. Его нельзя сравнивать с overall field rate без
одинакового size window.

## Воспроизводимая публикация

Один merged artifact из manifest-gated pipeline инжектируется в c-bet и
check-raise уроки скриптом `inject-full-history-field-data.mjs`. Если
нет источника, манифеста, exact rank timing, action identity или достаточного
denominator, browser остаётся в `methodology_only`.

Наблюдаемые частоты описывают поле и не являются solver target,
causal proof или гарантией EV.
