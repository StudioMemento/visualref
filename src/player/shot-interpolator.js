import {AXES,TRACKS} from "../core/default-state.js";
import {CREATIVE_AXES} from "../shots/creative-axes.js";
import {clamp,lerp,smoothstep} from "../core/utils.js";

export function activeShot(state){return state.shots.byId[state.shots.activeShotId];}

export function evaluateShot(state,shotId,frame){
  const shot=state.shots.byId[shotId]||activeShot(state);if(!shot)return null;
  const duration=Math.max(1,shot.durationFrames),linear=clamp(frame/duration,0,1),t=smoothstep(linear),values={};
  for(const axis of AXES)values[axis.id]=lerp(Number(shot.start.values[axis.id])||0,Number(shot.end.values[axis.id])||0,t);
  return {
    shotId:shot.id,shotName:shot.name,frame:clamp(frame,0,duration),duration,linear,t,values,
    choices:{start:{...(shot.start.choices||{})},end:{...(shot.end.choices||{})}},
    family:shot.family,presetId:shot.presetId,variant:shot.variant,seed:shot.seed,deltaTarget:shot.deltaTarget??.42
  };
}

export function deltaSummary(state,shotId=state.shots.activeShotId){
  const shot=state.shots.byId[shotId];if(!shot)return {count:0,numericCount:0,creativeCount:0,score:0,target:.42,risk:"stable",changed:[],creativeChanged:[]};
  const changed=[];let numericScore=0;
  for(const axis of AXES){
    const start=Number(shot.start.values[axis.id])||0,end=Number(shot.end.values[axis.id])||0,range=Math.max(.0001,axis.max-axis.min),distance=Math.abs(end-start)/range;
    if(distance>.0001){changed.push({axis,start,end,distance});numericScore+=distance;}
  }
  const creativeChanged=[];
  for(const axis of CREATIVE_AXES){
    const start=shot.start.choices?.[axis.id],end=shot.end.choices?.[axis.id];
    if(start!==end)creativeChanged.push({axis,start,end,distance:.08});
  }
  const score=clamp((numericScore/Math.max(1,AXES.length*.22))+(creativeChanged.length/Math.max(1,CREATIVE_AXES.length))*0.36,0,1);
  const target=clamp(Number(shot.deltaTarget??.42),.05,.95),ratio=score/Math.max(.05,target);
  const risk=ratio<.72?"stable":ratio<1.18?"active":"aggressive";
  return {count:changed.length+creativeChanged.length,numericCount:changed.length,creativeCount:creativeChanged.length,score,target,risk,changed,creativeChanged};
}

export function sequenceDuration(state){
  const clipEnds=Object.values(state.timeline.clips).map(clip=>clip.startFrame+clip.durationFrames);
  return Math.max(state.timeline.outFrame||0,...clipEnds,1);
}

export function activeClipsAtFrame(state,frame,{types=null}={}){
  const clips=Object.values(state.timeline.clips).filter(clip=>{
    if(types&&!types.includes(clip.type))return false;
    if(frame<clip.startFrame||frame>=clip.startFrame+clip.durationFrames)return false;
    const track=state.timeline.tracks[clip.trackId];
    if(!track||track.visible===false)return false;
    return true;
  });
  return clips.sort((a,b)=>(state.timeline.tracks[b.trackId]?.priority||0)-(state.timeline.tracks[a.trackId]?.priority||0)||b.startFrame-a.startFrame);
}

export function evaluateSequence(state,frame){
  const ordered=TRACKS.filter(track=>track.type==="video").sort((a,b)=>b.priority-a.priority);
  for(const track of ordered){
    if(state.timeline.tracks[track.id]?.visible===false)continue;
    const clip=Object.values(state.timeline.clips).filter(item=>item.trackId===track.id&&item.type==="shot"&&frame>=item.startFrame&&frame<item.startFrame+item.durationFrames).sort((a,b)=>b.startFrame-a.startFrame)[0];
    if(clip){
      const local=clamp(frame-clip.startFrame+(clip.sourceInFrame||0),0,clip.sourceOutFrame??clip.durationFrames);
      return {...evaluateShot(state,clip.shotId,local),clipId:clip.id,sequenceFrame:frame,trackId:track.id,effects:activeClipsAtFrame(state,frame,{types:["fx"]})};
    }
  }
  const shot=activeShot(state);return {...evaluateShot(state,shot.id,0),shotName:"SEQUENCE GAP",sequenceFrame:frame,gap:true,effects:activeClipsAtFrame(state,frame,{types:["fx"]})};
}
