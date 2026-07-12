(function(root){"use strict";
var STATES=["fold","open","weighted"];
function frequencyState(value){value=Number(value)||0;return value<=0?"fold":value>=100?"open":"weighted"}
function nextState(value){var index=STATES.indexOf(value);return STATES[(index+1+STATES.length)%STATES.length]}
function gradeDraft(draft,frequencies){
 var errors=[],missedOpen=[],falseOpen=[],wrongWeight=[];
 Object.keys(frequencies).forEach(function(hand){
  var expected=frequencyState(frequencies[hand]),chosen=draft[hand]||"fold";
  if(chosen===expected)return;
  var error={hand:hand,chosen:chosen,expected:expected};errors.push(error);
  if(chosen==="fold")missedOpen.push(error);
  else if(expected==="fold")falseOpen.push(error);
  else wrongWeight.push(error);
 });
 return{total:Object.keys(frequencies).length,correct:Object.keys(frequencies).length-errors.length,errors:errors,missedOpen:missedOpen,falseOpen:falseOpen,wrongWeight:wrongWeight};
}
root.PokerRfiRecall=Object.freeze({states:STATES.slice(),frequencyState:frequencyState,nextState:nextState,gradeDraft:gradeDraft});
})(typeof window!=="undefined"?window:globalThis);
