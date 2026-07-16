# Точная транскрипция чартов RFI vs 3-bet

Источник: исходная методичка FF, страница 7 (EP/MP/HJ/CO/BTN) и страница 12
(SB vs BB). Зелёный — call, фиолетовый — 4-bet, белый — fold. Всё, что не
перечислено, имеет нулевую частоту продолжения.

## EP

- 4-bet 100: `AA KK QQ AKs AKo`.
- Call 100: `AQs AJs ATs KQs KJs JJ TT`.
- Call 50: `KTs 99 88 87s 77 76s 66 65s 55 44`.
- Call 10: `A9s-A2s QJs QTs JTs`.

## MP

- 4-bet 100: `AA KK QQ AKs AKo`.
- Call 100: `AQs AJs ATs KQs KJs TT 99`.
- `JJ`: call 50 / 4-bet 50.
- Call 75: `87s 76s 65s`.
- Call 70: `88 77 66 55 44`.
- Call 50: `KTs`.
- Call 38: `54s`.
- Call 35: `QJs QTs JTs`.
- Call 30: `T9s 98s`.
- Call 25: `AQo`.
- Call 15: `A9s-A2s`.
- Call 10: `33 22`.

## HJ

- 4-bet 100: `AA KK QQ JJ AKs AKo AQo`.
- Call 100: `AQs AJs ATs KQs KJs KTs QJs QTs JTs TT T9s 99 98s 88 87s
  76s 66 65s 55 54s 44 33 22`.
- Call 99: `77`.
- Call 50: `A9s-A2s K9s Q9s J9s`.

## CO

- 4-bet 100: `AA KK QQ JJ AKs AKo AQo`.
- Call 100: `AQs-A2s KQs-K8s QJs-Q9s JTs J9s TT T9s 99 98s 88 77
  66 55 44 33 22`.
- Call 90: `87s 76s 65s 54s`.
- Call 50: `K7s KQo Q8s AJo J8s T8s 97s 86s`.
- Call 1: `K6s`.

## BTN

- 4-bet 100: `AA KK QQ JJ TT 99 AKs AQs AKo AQo`.
- Call 100: `AJs-A2s KQs-K7s KQo QJs-Q8s AJo KJo JTs-J8s ATo
  T9s T8s 98s 97s 88 87s 86s 77 76s 66 65s 55 54s 44 33 22`.
- Call 51: `K6s`.
- Call 50: `Q7s J7s T7s`.

## SB vs BB

- 4-bet 100: `AA KK QQ JJ TT 99 AKs AQs AKo`.
- Call 100: `AJs ATs A9s KQs KJs KTs AQo KQo QJs QTs AJo JTs ATo
  88 77 66 55 44`.
- Call 50: `A8s-A2s K9s Q9s KJo QJo J9s T9s 98s`.

## Границы транскрипции

Позиционные матрицы подписаны `vs3bet all`: они не разделяют позицию
3-беттора, IP/OOP или стек. Страница 15 даёт точный сайзинг-пример только для
`CO open 2 BB → BTN 3-bet` и общий принцип: на 2.5x защищать больше suited
call, на 4x резко сокращать call и часть сильных рук переводить в 4-bet.

Любой полный фильтр по стеку, IP/OOP и сайзу поверх этих базовых клеток должен
быть подписан как учебная адаптация, а не как дословный chart source.
