# Changelog standalone-тренажёров

Документ ведёт историю правок по standalone Learning Hub тренажёрам:

- `rfi-open-position-lesson` — open-raise по позициям;
- `bb-call-defense-lesson` — защита BB коллом;
- `resteal-lesson` — рестил;
- `flop-cbet-hu-lesson` — c-bet HU;
- `flop-checkraise-lesson` — check-raise флопа;
- `vs-3bet-defense-lesson` — защита против 3-бета;
- `poker-simulator` — общие практические и embedded-сценарии, которые используют уроки.

Статусы:

- `Released` — изменение уже попадало в коммиты за 2026-07-17—2026-07-20.
- `Local WIP` — изменение есть в текущем рабочем дереве, но ещё не закоммичено и не опубликовано.
- `Context` — восстановлено по QA-потоку и локальным заметкам; перед релизом проверять по фактическому diff.

## Текущий локальный WIP

Статус: `Local WIP`.

### Общая система и стиль

- Добавлен общий слой оформления чартов: `assets/poker-kit/chart-system.css`.
- Все шесть lesson-страниц подключаются к общему chart-system, чтобы не плодить разные стили матриц.
- Добавлен контрактный smoke `scripts/check-chart-system-contract.mjs`; общий `scripts/check-learning-contracts.mjs` учитывает новый контракт.
- В `AGENTS.md` добавлены правила для будущих правок:
  - использовать общие chart-system паттерны;
  - не возвращать сырой технический текст и большие `N`-табло в основной UX;
  - отделять рекомендации от наблюдаемой игры поля;
  - помечать слабые сэмплы и не выдавать их как точные чарты.
- Убрана часть технического текста в уроках: длинные provenance/denominator-пояснения, сырые sample-count строки, повторяющиеся caveat-блоки.
- Для малых выборок унифицирована маркировка: слабые клетки и строки показываются как ориентир, а не как уверенная рекомендация.

### Open-raise по позициям

- В практике унифицируется action dock: три крупные кнопки `пас / колл / рейз`, без полноценного симуляторного betbox там, где решение учебное.
- Для режима `только префлоп / вся раздача` фиксируется единая логика следующей ситуации и feedback-панели.
- Виджет разбора после руки делается компактнее: кнопка следующей раздачи выносится из контейнера чарта, окно разбора можно закрывать.
- В обзоре по позициям показываются попадания/ошибки по позициям; hover/детализация показывает лишние opens и пропущенные opens разными цветами.
- Вкладка `Чарты` очищается до стеков `15+ BB`; короткие push/fold-секции убраны из основной рекомендации, чтобы не перегружать справочник.
- Вкладка `Как играют реги` остаётся для наблюдаемой игры поля и коротких стеков; селекторы стеков увеличены, матрицы осветлены.
- Добавлена таблица fold equity и частоты получить 3-бет по количеству игроков за спиной, от 6 до 1 игрока.
- Для статистики по FE выставлена глубина `30 BB+` и проверка, что open-push не просачивается в сэмпл.

### Защита BB коллом

- Порядок вкладок приводится к продуктовой логике: `Видео` до данных, `Чарты` до `Данных`, практика в конце.
- Переписан главный посыл: цель — довести решения защиты BB до автоматизма, а не просто “коллить”.
- На главной странице подчёркнуто:
  - BB замыкает экшн;
  - за один блайнд можно гарантированно увидеть флоп;
  - это не heads-up стол, а полный стол с уже завершённым экшеном до BB.
- Целевые показатели защиты показывают `пас` как главный риск-метрик: если фолд слишком высокий, оппонентам выгодно душить открывающего через 3-беты.
- В data-вкладку добавлены срезы по глубинам `70 BB+`, `40–70 BB`, `0–40 BB`.
- Для multiway добавлено объяснение, почему широко заходить хуже: pot odds лучше, но equity и реализация equity страдают из-за sandwich-позиции и сильного range коллера.
- Для третьей лиги добавлены/уточнены блоки equity realization: показывается разница equity и реализуемого equity по типам рук, со сноской про коэффициент реализации.
- Практика визуально подравнивается под open-raise: те же крупные кнопки, похожая панель результата, одинаковая геометрия стола и ответа.

### Рестил

- Вкладка `Подробнее` переименована в `Математика рестила`.
- Данные про рост restil-push по лигам вынесены в отдельную вкладку и оформляются как наблюдаемая игра поля, не как рекомендация.
- Возвращается сравнение EV, потому что главный урок рестила — не частота сама по себе, а то, что spot может быть на блайнд плюсовее в chipEV.
- Добавлена вкладка `Реакция на рестилы`: как поле отвечает на restil в разных стексайзах, позициях и сайзах open.
- В `Реакция на рестилы` исправляется фильтр, чтобы не смешивать squeeze-push и reraise-over поверх restil.
- Continuation chart нормируется по возможностям открытия конкретной руки: если AA открывается почти всегда, а 55 открывается реже, цвет показывает долю продолжений относительно открытий этой руки, а не сырой абсолютный счёт.
- Левый baseline для новичков собирается по `R15–17`, а не слишком шумной общей novice-группе.
- Градиенты в матрицах restil/rank comparison осветляются и приводятся к общему стилю, чтобы процент и hand label читались.
- Практика переводится на три крупные кнопки `пас / колл / рестил` в едином визуальном стиле.

### C-bet HU

- Практика переводится с simulator-like управления на учебный режим:
  - ограниченное число крупных кнопок;
  - счётчик правильных и ошибок;
  - понятный feedback после ответа;
  - удобная кнопка следующей ситуации рядом с action area, без необходимости скроллить.
- Исправляется обрезание action-кнопок снизу.
- Фиш/рег профиль выделяется не только текстом, но и цветом/стилем бокса, чтобы сразу было понятно, против кого играем.
- Больший сайз с хорошей рукой трактуется мягче: это может быть разумный exploit, но в feedback добавляется предупреждение, что компетентные оппоненты могут читать сайзинг.

### Check-raise флопа

- Практика стала бесконечной: ситуации генерируются процедурно, а не заканчиваются ограниченным паком.
- Добавлен тумблер `Только флоп / Полная раздача`.
- Feedback разделён на базовые категории:
  - check-raise OK;
  - loose check-raise;
  - очевидно пропущенный check-raise;
  - call как допустимое решение для средних рук.
- Уточнены грейдеры по спорным рукам:
  - `AK` на `T62` против крупного сайза — минимум call;
  - suited связки с equity не должны автоматически уходить в fold;
  - `KQ` на `J72` может рейзиться из-за блокеров `KK/QQ/KJ/QJ`, equity и backdoors.
- Для full-hand режима отмечен открытый класс проблем: postflop continuation не должен чекать behind там, где aggressor очевидно продолжает ставить turn/river.
- Вкладка `Главное` очищена от технических аннотаций и лишних summary-блоков.
- Добавлен K92r value/mix блок:
  - board показывается картами;
  - сильное value: `K9`, `K2`, `92s`, `22`, `99`;
  - сильные Kx миксуются: `KQ`, `KJ`, `KT`;
  - объясняется, что `Q/J/T` блокируют часть broadway-barrel рук соперника.
- Убран дубль value-списка слева, если та же информация уже показана на карточках справа.
- В data-таблицах переименовано `c-bet` в смысл `нам ставят`: это частота, с которой CO/BTN ставит в BB после нашего check.
- Таблицы по структурам флопа поджаты: убраны raw sample counts, добавлены визуальные разделители двойных столбцов по лигам.
- На вкладке `Примеры` добавляются реальные check-raise hand examples из базы League 1 по всем категориям досок и разным типам рук.

### Защита против 3-бета

- Вкладки `Чарты` и `Как играют реги` объединяются в один более плотный справочник: слева наша стратегия, справа поле с теми же фильтрами.
- `Пас` становится основным показателем на таблицах, потому что overfold — главный источник того, что нас выгодно 3-бетить.
- На `Главное` выносится целевая логика по позициям:
  - сколько фолдить;
  - сколько коллить;
  - сколько 4-бетить;
  - сколько пушить;
  - почему это выгодно;
  - где проходит граница, после которой оппонентам становится слишком прибыльно давить.
- В matrix explorer добавлен вес открытия руки: если рука почти не открывается в исходном range, цветовая заливка показывается только нижней частью клетки, а не как полноценная частота.
- Добавлен компактный блок сравнения “наша стратегия и поле” по одной руке с одинаковыми фильтрами.
- Перегруженная инфографика по слоям заменяется более читаемой таблицей/карточкой: вместо одинаковых bar widgets показываются различия по действиям и открываемость руки.
- Раздел частых ошибок объясняется проще: “здесь видно, как стратегия начинающих игроков отличается от топов”.
- Из раздела убираются лишние технические заголовки и context chips, если фильтры уже видны на экране.
- Матрица ошибок должна показывать частые hand-level отклонения поля от целевой стратегии: где поле лишне защищается и где недозащищается.

## История изменений за последние 4 дня

### 2026-07-17

#### `61a5bdc` — `feat(checkraise): add infinite procedural practice`

Статус: `Released`.

- Добавлен procedural generator для check-raise практики.
- Check-raise практика перестала быть фиксированным коротким паком.
- Добавлены тесты генератора и контракта практики.
- Обновлены shared field lesson компоненты, чтобы practice route мог работать как самостоятельный учебный экран.

#### `f8d105e` — `feat(vs3bet): add range explorer and filtered practice`

Статус: `Released`.

- Добавлен range explorer для защиты против 3-бета.
- Добавлены фильтры по позиции, effective stack, размеру 3-бета и IP/OOP.
- Добавлен слой practice по конкретным spot-фильтрам.
- Добавлены `continuations`, `range-model`, field data и contract tests.

#### `b2e3d0c`, `180738e`, `be43073` — mobile practice clipping

Статус: `Released`.

- Исправлялась видимость mobile lesson tabs.
- Исправлялось clipping поведение practice-контейнеров на мобильных/узких viewport.
- Затронуты `rfi-open-position-lesson`, `resteal-lesson`, `flop-cbet-hu-lesson`.

#### `e2895e6` — `feat(hub): add standalone poker simulator`

Статус: `Released`.

- Standalone simulator добавлен в hub.
- Simulator стал отдельным маршрутом и частью общего набора тренажёров.

#### `5e9e4a6` — `fix(simulator): auto-run covered short blind`

Статус: `Released`.

- Исправлен short blind spot: если наша ставка уже покрывает ставку BB, action переводится в auto all-in / auto-runout логику.
- Добавлен focused simulator smoke.

#### `06e218b` — `fix(simulator): sync stable action and replay UI`

Статус: `Released`.

- Стабилизировались action controls и replay UI.
- Исправлялись прыжки geometry, action animation и betbox.
- Обновлены simulator renderer/adapters/effects, которые потом начали использовать embedded practice flows.

### 2026-07-18

#### `ce0ef42` — `feat(lessons): refresh trainer practice and field guidance`

Статус: `Released`.

- Большой refresh шести lesson routes.
- BB defense получил новые blocks по realization, ranks и data tools.
- RFI получил field-backed open data и practice stats.
- Resteal получил обновлённый engine/rank comparison/simulator pack.
- C-bet и check-raise получили unified practice pieces.
- Добавлены route cache-busts и shared simulator pack updates.

#### `94e8d71` — `feat(lessons): publish field-backed trainer refresh`

Статус: `Released`.

- Добавлены field-backed data slices:
  - BB defense realization;
  - check-raise reverse hero / board category reconciliation;
  - resteal strict opener response и exact BB observed;
  - RFI field-action quality/query/build/test;
  - vs-3bet field data build/test.
- Добавлены/обновлены contract checks для data-backed content.

### 2026-07-19

#### `674e3d0` — `feat(lessons): ship unified trainer refresh`

Статус: `Released`.

- Добавлен общий lesson-header contract и shared header CSS/JS.
- BB defense получил L1 multiway и L3 realization/shape data.
- Resteal получил reaction summary.
- RFI получил position pressure.
- Simulator получил reveal-card geometry и action-board timeline checks.
- Header обновлён на всех standalone lesson routes.

#### `0b7a096` — `feat(lessons): refresh practice flows and field data`

Статус: `Released`.

- C-bet получил next dock и новый practice flow.
- Resteal получил rank diagnostics/cube.
- RFI получил simulator pack и position pressure updates.
- Simulator получил action timeline updates.
- Обновлены route cache-busts.

### 2026-07-20 / 2026-07-21

#### `43229bf` — `feat(lessons): publish field-backed trainer polish`

Статус: `Released`.

- Обновлены shared field lesson CSS/JS.
- C-bet UX дополнительно выровнен под общий practice pattern.
- Check-raise получил дополнительные data/field matrix/practice-generator improvements и League 1 examples.
- Vs-3bet получил range explorer UI polish и wisdom reference updates.
- Добавлен design QA контекст.

#### Текущий локальный пакет после `43229bf`

Статус: `Local WIP`.

- Shared chart-system добавлен как общая основа для будущих чартов.
- Убирается технический текст в open-raise, BB defense, resteal, c-bet, check-raise, vs-3bet.
- Проверяется, чтобы chart styles не расходились по тренажёрам.
- Уточняется data confidence:
  - weak samples не выглядят как сильные рекомендации;
  - низкие `N` и пустые cells не маскируются;
  - observed field play не смешивается с “нашей рекомендацией”.
- В vs-3bet дополнительно уплотняются combined charts/reg view и error matrix.
- В check-raise дополнительно чистятся examples, incoming c-bet labels и compact board/category table.

## Data inventory и полезность сэмплов

Последняя локальная инвентаризация data-backed блоков:

- Open-raise:
  - 216 агрегированных field charts;
  - минимальный сэмпл по chart-срезам около `2 959`;
  - медианный сэмпл около `74 381`;
  - максимальный сэмпл около `6,73M`;
  - hand-level cells: `36 504`, из них слабые/скрытые около `1 642`.
- BB defense:
  - около `11,66M` решений;
  - около `10,09M` решений с известными картами;
  - hand-level cells около `30 420`, почти без пустых cells;
  - realization sample около `4,86M` calls.
- Resteal:
  - около `1,158M` возможностей;
  - около `71k` direct jam events;
  - reaction-to-restil около `128k` responses.
- C-bet:
  - около `2,3M` входных решений;
  - около `2,256M` ranked decisions;
  - 480 основных metric cells с минимальными denominators выше `231`.
- Check-raise:
  - около `2,256M` ranked postflop decisions;
  - около `1,267M` CO/BTN vs BB релевантных решений;
  - examples требуют расширения по всем board categories и hand types.
- Vs-3bet:
  - около `5,05M` решений;
  - 798 aggregate charts;
  - медианный total sample около `2 149`;
  - около 82 weak cells меньше 100 должны отображаться как слабые, а не уверенные.

## Проверки, которые уже покрывают пакет

Последний локальный QA-пакет для standalone lessons включал:

- route-specific lesson contracts для всех шести тренажёров;
- `node scripts/check-learning-contracts.mjs`;
- `node scripts/check-chart-system-contract.mjs`;
- `node scripts/check-lesson-header-contract.mjs`;
- `git diff --check`;
- unique generator smoke для check-raise на `1500` hands;
- desktop/mobile browser QA на шести routes.

Ограничение: широкий `npm run check` в sandbox упирался в `EPERM` при попытке поднять duplicate localhost listener в `scripts/check-local-routes.mjs`. Это не заменяет финальный release gate перед публикацией.

## Открытые UX/functional риски

- Embedded/full-hand practice всё ещё зависит от единого simulator timeline barrier. Если тренажёр обходит общий simulator runtime, могут возвращаться:
  - раннее открытие флопа до окончания preflop action animation;
  - разные версии betbox;
  - fallback-позиционирование карт оппонентов.
- Для всех practice routes нужно сохранять единый action dock:
  - три большие кнопки для учебного решения;
  - next situation рядом с action area;
  - feedback без обязательного скролла.
- Для всех chart/data routes нужно поддерживать один стиль:
  - общий chart-system;
  - action colors consistent;
  - compact labels;
  - no raw SQL/provenance/N-heavy panels в основном UX;
  - weak samples явно помечены.
