# FF Poker Learning Hub

Отдельный статический обучающий хаб с шестью интерактивными уроками по префлопу и постфлопу и полноценным покерным симулятором:

**Production:** https://ff-poker-learning-hub.vercel.app

1. **Опен-рейзы по позициям** — диапазоны RFI от EP до BTN и практика на движке симулятора.
2. **Защита BB коллом** — цена колла, сайзинги и диапазоны защиты против пяти позиций.
3. **Рестилы в коротких стеках** — EV пуша, профили соперников и практические раздачи.
4. **C-bet IP против BB** — структуры флопа, размеры, observed FE и check-raise BB в Q2 2026.
5. **Чек-рейз флопа** — один точный узел BB против c-bet CO/BTN после защиты стила, примеры value/полублефов и два бесконечных режима практики.
6. **Защита против 3-бета** — fold/call/4-bet после собственного RFI с поправками на позицию, размер и стек.
7. **Покерный симулятор** — свободная игра за 1–4 столами против соперников разной силы, с фидбеком, статистикой и повторами.

Новые страницы повторяют общий учебный алгоритм хаба: первое решение внутри функционального покерного стола → три короткие опоры → проверенный срез поля → при наличии hand-level evidence библиотека примеров → локальная практика с разбором. Наблюдаемые частоты FF всегда отделены от методических ориентиров и не выдаются за solver-optimal стратегию.

## Данные новых уроков

- C-bet: детерминированная 70% Q2 2026 HH-выборка, 2 256 311 ranked RvBB-спотов; validation `pass_with_warnings` из-за 91,1% compact-HH coverage и UTC-допущения для timestamp без timezone.
- Check-raise: полный Q2 2026 strict BB-vs-CO/BTN-RFI tree; `150 387 / 1 018 330` rank-matched X/R (`94,69%` denominator coverage). Fold aggressor vs X/R считается отдельно; exact board/combo frequency не заявлена, карточки остаются методическими.
- Защита на 3-бет: `N=6 557 996` opener-after-RFI opportunities за август 2025 — июль 2026; rank-at-month-start coverage 98,4%.

Подробные определения и ограничения находятся рядом с уроками в `assets/poker-*/research/README.md`. Приватные hand histories, nicknames и player IDs в хаб не копируются.

## Проверка

```bash
npm run check
npm run dev
```

После запуска откройте `http://127.0.0.1:4173`. Локальный сервер поддерживает те же чистые URL, что и Vercel, например `/rfi-open-position-lesson`, `/flop-checkraise-lesson` и `/poker-simulator`.

## Структура

- `index.html`, `hub.css` — отдельная главная хаба;
- `rfi-open-position-lesson.html` — опен-рейзы;
- `bb-call-defense-lesson.html` — защита BB;
- `resteal-lesson.html` — рестилы;
- `flop-cbet-hu-lesson.html` — c-bet IP против BB;
- `flop-checkraise-lesson.html` — чек-рейз BB против c-bet после защиты от CO/BTN стила;
- `vs-3bet-defense-lesson.html` — защита собственного опена на 3-бет;
- `poker-simulator.html` — самостоятельный симулятор и общий движок практики уроков;
- `assets/` — общий UI-kit, симулятор и данные уроков.

Исходники уроков собраны из рабочего среза `ff-start-poker-hub` и зафиксированы здесь как самостоятельный deployable snapshot.
