(function(){"use strict";
var ranks="AKQJT98765432".split("");
var preflopPotBb=window.FFTrainerSimulatorSnapshot&&window.FFTrainerSimulatorSnapshot.preflopPotBb;
// The simulator content pack can import this range file without the lesson
// renderer. The lesson route uses the shared model; the data-only pack keeps
// the same audited unopened total as a serialization fallback.
var unopenedPotBb=typeof preflopPotBb==="function"?preflopPotBb({anteBb:1}):2.5;
var sourceHeadingTargets={EP:20,MP:26,HJ:32,CO:47,BTN:75};
// Page 7 is a two-colour chart: every printed value above 75 is filled,
// while 5 and 50 stay white. The lesson intentionally teaches that filled
// 35+ BB core; the printed heading percentages remain separate source labels.
var PAGE7_BINARY_FILL_THRESHOLD=75;
var rangeRule={
 id:"page7-filled-core-35plus",
 label:"учебное бинарное ядро",
 sourceLabel:"подпись страницы 7",
 stackScope:"35+ BB",
 threshold:PAGE7_BINARY_FILL_THRESHOLD
};
var positions={
 EP:{pct:0,label:"ранняя",hint:"Все одномастные тузы, сильные бродвеи и компактная связанная часть диапазона. Шесть игроков ещё могут ответить."},
 MP:{pct:0,label:"средняя",hint:"Добавляем разномастные бродвеи и часть младших одномастных королей. Редкие варианты оставляем за границей учебного чарта."},
 HJ:{pct:0,label:"хайджек",hint:"Четверо за спиной: появляются все одномастные короли, больше разномастных тузов и связанные руки."},
 CO:{pct:0,label:"катофф",hint:"Открываем все одномастные короли, почти все одномастные дамы и заметно расширяем разномастную часть."},
 BTN:{pct:0,label:"баттон",hint:"Два блайнда за спиной: весь одномастный верх и большинство основных разномастных открытий."}
};

// Page 7, top RFI row. Every number is the open-raise frequency printed in the source chart.
var chartRows={
 EP:[
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 80 0 0 0 0 0",
  "100 100 100 100 100 100 80 0 0 0 0 0 0",
  "100 80 0 100 100 100 80 0 0 0 0 0 0",
  "99 0 0 0 100 100 80 0 0 0 0 0 0",
  "0 0 0 0 0 100 80 0 0 0 0 0 0",
  "0 0 0 0 0 0 100 80 0 0 0 0 0",
  "0 0 0 0 0 0 0 100 100 0 0 0 0",
  "0 0 0 0 0 0 0 0 100 95 0 0 0",
  "0 0 0 0 0 0 0 0 0 100 0 0 0",
  "0 0 0 0 0 0 0 0 0 0 80 0 0",
  "0 0 0 0 0 0 0 0 0 0 0 0 0",
  "0 0 0 0 0 0 0 0 0 0 0 0 0"
 ],
 MP:[
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 50 50 50 50",
  "100 100 100 100 100 100 100 0 0 0 0 0 0",
  "100 100 100 100 100 100 100 0 0 0 0 0 0",
  "99 100 100 100 100 100 100 0 0 0 0 0 0",
  "50 0 0 0 0 100 100 0 0 0 0 0 0",
  "50 0 0 0 0 0 100 100 0 0 0 0 0",
  "0 0 0 0 0 0 0 100 100 0 0 0 0",
  "0 0 0 0 0 0 0 0 100 100 0 0 0",
  "0 0 0 0 0 0 0 0 0 100 50 0 0",
  "0 0 0 0 0 0 0 0 0 0 100 0 0",
  "0 0 0 0 0 0 0 0 0 0 0 50 0",
  "0 0 0 0 0 0 0 0 0 0 0 0 50"
 ],
 HJ:[
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 100 100 80 80",
  "100 100 100 100 100 100 100 99 0 0 0 0 0",
  "100 100 100 100 100 100 100 80 0 0 0 0 0",
  "100 100 100 100 100 100 100 100 0 0 0 0 0",
  "100 80 0 0 80 100 100 100 0 0 0 0 0",
  "100 0 0 0 0 0 100 100 80 0 0 0 0",
  "80 0 0 0 0 0 0 100 100 0 0 0 0",
  "0 0 0 0 0 0 0 0 100 100 0 0 0",
  "0 0 0 0 0 0 0 0 0 100 98 0 0",
  "0 0 0 0 0 0 0 0 0 0 100 0 0",
  "0 0 0 0 0 0 0 0 0 0 0 100 0",
  "0 0 0 0 0 0 0 0 0 0 0 0 80"
 ],
 CO:[
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 100 100 80 80",
  "100 100 100 100 100 100 100 100 100 100 80 5 5",
  "100 100 100 100 100 100 100 100 100 5 0 0 0",
  "100 100 100 100 99 100 100 100 100 5 0 0 0",
  "100 80 80 80 80 80 100 100 100 80 0 0 0",
  "100 80 0 0 0 0 5 100 100 100 0 0 0",
  "100 5 0 0 0 0 0 0 100 100 80 0 0",
  "100 0 0 0 0 0 0 0 0 100 100 0 0",
  "100 0 0 0 0 0 0 0 0 0 100 5 0",
  "80 0 0 0 0 0 0 0 0 0 0 100 0",
  "80 0 0 0 0 0 0 0 0 0 0 0 100"
 ],
 BTN:[
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 100 100 100 100",
  "100 100 100 100 100 100 100 100 100 100 100 100 80",
  "100 100 100 100 100 100 100 100 100 100 100 100 80",
  "100 100 100 100 100 100 100 100 100 100 80 80 80",
  "100 100 100 100 100 100 100 100 100 100 80 80 80",
  "100 100 100 80 80 80 100 100 100 100 100 80 80",
  "100 100 80 50 50 50 50 80 100 100 100 80 80",
  "100 100 50 5 5 5 5 50 50 100 100 100 80",
  "100 80 50 5 5 5 5 5 5 50 100 80 80",
  "100 80 50 5 5 0 0 0 0 0 5 100 80",
  "100 80 50 5 5 0 0 0 0 0 0 0 100"
 ]
};

function handAt(row,col){return row===col?ranks[row]+ranks[row]:row<col?ranks[row]+ranks[col]+"s":ranks[col]+ranks[row]+"o"}
var sourceFrequencies={},frequencies={},opens={},targets={},exactTargets={};
Object.keys(chartRows).forEach(function(position){
 var sourceFrequency={},frequency={},open={};
 chartRows[position].forEach(function(row,rowIndex){
  row.split(" ").forEach(function(value,colIndex){var hand=handAt(rowIndex,colIndex),sourcePct=Number(value),pct=sourcePct>PAGE7_BINARY_FILL_THRESHOLD?100:0;sourceFrequency[hand]=sourcePct;frequency[hand]=pct;if(pct===100)open[hand]=true});
 });
 sourceFrequencies[position]=sourceFrequency;frequencies[position]=frequency;opens[position]=open;
});
function comboWeight(hand){return hand.length===2?6:hand.slice(-1)==="s"?4:12}
Object.keys(frequencies).forEach(function(position){
 var combos=Object.keys(frequencies[position]).reduce(function(total,hand){return total+(frequencies[position][hand]===100?comboWeight(hand):0)},0),exact=Math.round(combos/1326*1000)/10,rounded=Math.round(exact);
 exactTargets[position]=exact;targets[position]=rounded;positions[position].pct=rounded;positions[position].sourcePct=sourceHeadingTargets[position];
});

var firstSpot={
 id:"rfi-intro-a9o-ep",
 title:"Первая раздача",
 hand:"A9o",
 question:"A9o в ранней позиции. Что нажмёшь?",
 answer:"Базовая линия — пас. A9o не входит в ранний диапазон открытия.",
 table:{
  seats:[
   {label:"UTG",state:"hero",stackBb:40},
   {label:"LJ",state:"waiting",stackBb:40},
   {label:"HJ",state:"waiting",stackBb:40},
   {label:"CO",state:"waiting",stackBb:40},
   {label:"BTN",state:"waiting",stackBb:40},
   {label:"SB",state:"blind",stackBb:40},
   // The snapshot subtracts the posted big blind. The pre-deducted BB ante
   // makes 39 render the intended visible 38 BB without charging it twice.
   {label:"BB",state:"blind",stackBb:39}
  ],
  heroPosition:"UTG",
  heroStack:"40 BB",
  effectiveStack:"40 BB",
  pot:unopenedPotBb+" BB",
  anteBb:1,
  heroCards:["As","9d"],
  boardCards:[],
  street:"preflop",
  actionLine:[],
  historyLine:"BB ante 1 BB · ранняя позиция · 6 игроков за спиной",
  toCall:0,
  currentBet:0,
  dealerPosition:"BTN"
 },
 options:[
  {key:"fold",label:"Пас",correct:true,feedback:"За спиной шесть игроков, поэтому A9o здесь пас."},
  {key:"limp",label:"Колл",correct:false,feedback:"В базовой стратегии неоткрытого банка лимпа нет. За спиной шесть игроков, поэтому A9o здесь пас."},
  {key:"raise",label:"Рейз 2 BB",correct:false,feedback:"Эта рука откроется позже, но не из EP. За спиной шесть игроков, поэтому A9o здесь пас."}
 ]
};

var spots=[
 ["EP","A9o",0,"A9o не входит в основной чарт EP: за спиной ещё шесть игроков."],["EP","66",1,"66 входит в основной чарт EP."],["EP","KQo",1,"KQo входит в ранний диапазон."],["EP","QJo",0,"QJo остаётся пасом из EP."],
 ["MP","KTo",1,"KTo входит в основной чарт MP."],["MP","QJo",1,"QJo добавляется со средней позиции."],["MP","K9o",0,"K9o ещё не входит в основной чарт MP."],["HJ","44",1,"44 входит в основной чарт HJ."],
 ["HJ","QTo",1,"QTo входит в основной чарт HJ."],["HJ","K8o",0,"K8o остаётся пасом из HJ."],["CO","A5o",1,"A5o входит в основной чарт CO."],["CO","Q9o",1,"Q9o входит в основной чарт CO."],
 ["CO","Q7o",0,"Q7o остаётся пасом из CO."],["CO","76s",1,"76s входит в основной чарт CO."],["BTN","K5o",1,"K5o входит в основной чарт BTN."],["BTN","92o",0,"92o остаётся пасом даже на BTN."],
 ["BTN","Q7o",1,"Q7o входит в основной чарт BTN."],["BTN","87o",1,"87o входит в основной чарт BTN."],["BTN","72o",0,"Широкий BTN — не любые две карты: 72o остаётся пасом."],["BTN","54s",1,"54s входит в основной чарт BTN."]
].map(function(item,index){return{id:"rfi-"+index,position:item[0],hand:item[1],open:!!item[2],frequency:frequencies[item[0]][item[1]],reason:item[3]}});

window.PokerRfiData=Object.freeze({version:"rfi-open-page7-20260726-v6",physicalPage:7,rangeThreshold:PAGE7_BINARY_FILL_THRESHOLD,rangeRule:Object.freeze(rangeRule),sourceHeadingTargets:Object.freeze(sourceHeadingTargets),positions:positions,ranks:ranks,sourceFrequencies:sourceFrequencies,frequencies:frequencies,opens:opens,firstSpot:Object.freeze(firstSpot),spots:spots,targets:targets,exactTargets:exactTargets})
})();
