(function(root){
"use strict";
var POSITIONS=["EP","MP","HJ","CO","BTN"];
function emptyHand(){return{attempts:0,correct:0,extraOpens:0,missedOpens:0,otherMistakes:0,lastAction:""}}
function emptyPosition(){return{attempts:0,correct:0,extraOpens:0,missedOpens:0,otherMistakes:0,hands:{}}}
function create(){var stats={};POSITIONS.forEach(function(position){stats[position]=emptyPosition()});return stats}
function bucketFor(stats,position){if(!stats[position])stats[position]=emptyPosition();return stats[position]}
function record(stats,decision){
 var position=decision.position,hand=decision.hand,chosen=decision.chosen,expected=decision.expected==='open'?'open':'fold',correct=chosen===expected,bucket=bucketFor(stats,position),handBucket=bucket.hands[hand]||(bucket.hands[hand]=emptyHand());
 bucket.attempts++;handBucket.attempts++;handBucket.lastAction=chosen;
 if(correct){bucket.correct++;handBucket.correct++}
 else if(chosen==='open'&&expected==='fold'){bucket.extraOpens++;handBucket.extraOpens++}
 else if(chosen!=='open'&&expected==='open'){bucket.missedOpens++;handBucket.missedOpens++}
 else{bucket.otherMistakes++;handBucket.otherMistakes++}
 return correct
}
function summary(stats,position){
 var bucket=bucketFor(stats,position),attempts=bucket.attempts;
 return{attempts:attempts,correct:bucket.correct,accuracy:attempts?Math.round(bucket.correct/attempts*100):null,extraOpens:bucket.extraOpens,missedOpens:bucket.missedOpens,otherMistakes:bucket.otherMistakes}
}
function hand(stats,position,handName){var bucket=bucketFor(stats,position);return bucket.hands[handName]||emptyHand()}
root.PokerRfiPracticeStats={POSITIONS:POSITIONS,create:create,record:record,summary:summary,hand:hand};
})(window);
