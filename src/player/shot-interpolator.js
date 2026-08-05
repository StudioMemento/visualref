import {AXES,TRACKS} from "../core/default-state.js";
import {clamp,lerp,smoothstep} from "../core/utils.js";

export function activeShot(state){return state.shots.byId[state.shots.activeShotId];}
export function evaluateShot(state,shotId,frame){
  const shot=state.shots.byId[shotId]||activeShot(state);if(!shot)return null;
  const duration=Math.max(1,shot.durationFrames),linear=clamp(frame/duration,0,1),t=smoothstep(linear),values={};
  for(const axis of AXES)values[axis.id]=lerp(shot.start.values[axis.id],shot.end.values[axis.id],t);
  return {shotId:shot.id,shotName:shot.name,frame:clamp(frame,0,duration),duration,linear,t,values};
}
export function deltaSummary(state,shotId=state.shots.activeShotId){
  const shot=state.shots.byId[shotId];if(!shot)return {count:0,score:0,changed:[]};
  const changed=[];let score=0;
  for(const axis of AXES){const start=shot.start.values[axis.id],end=shot.end.values[axis.id],range=Math.max(.0001,axis.max-axis.min),distance=Math.abs(end-start)/range;if(distance>.0001){changed.push({axis,start,end,distance});score+=distance;}}
  return {count:changed.length,score:Math.min(1,score/Math.max(1,AXES.length*.22)),changed};
}
export function sequenceDuration(state){
  const clipEnds=Object.values(state.timeline.clips).map(clip=>clip.startFrame+clip.durationFrames);
  return Math.max(state.timeline.outFrame||0,...clipEnds,1);
}
export function evaluateSequence(state,frame){
  const ordered=TRACKS.filter(track=>track.type==="video").sort((a,b)=>b.priority-a.priority);
  for(const track of ordered){
    if(state.timeline.tracks[track.id]?.visible===false)continue;
    const clip=Object.values(state.timeline.clips).filter(item=>item.trackId===track.id&&item.type==="shot"&&frame>=item.startFrame&&frame<=item.startFrame+item.durationFrames).sort((a,b)=>b.startFrame-a.startFrame)[0];
    if(clip){const local=clamp(frame-clip.startFrame+clip.sourceInFrame,0,clip.sourceOutFrame||clip.durationFrames);return {...evaluateShot(state,clip.shotId,local),clipId:clip.id,sequenceFrame:frame,trackId:track.id};}
  }
  const shot=activeShot(state);return {...evaluateShot(state,shot.id,0),shotName:"SEQUENCE GAP",sequenceFrame:frame,gap:true};
}
