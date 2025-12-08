const paramDefinitions = (synth) => [
  {
    name: 'kick_vca', type: 'kick', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.kick.output.factor.value = x
  },
  {
    name: 'kick_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x => synth.kick.startPoint= x
  },
  {
    name: 'snare_vca', type: 'snare', min: 0, max: 1, value: .7, curve: 1,
    callback: x => synth.snare.output.factor.value = x
  },
  {
    name: 'snare_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x => synth.snare.startPoint= x
  },
  {
    name: 'hat_vca', type: 'hihat', min: 0, max: 1, value: .5, curve: 1,
    callback: x => synth.hat.output.factor.value = x
  },
  {
    name: 'hat_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x => synth.hat.startPoint= x
  },
  {
    name: 'toms_vca', type: 'toms', min: 0, max: 1, value: .7, curve: 1,
    callback: x => {
      synth.p1.output.factor.value = x;
      synth.p2.output.factor.value = x;
      synth.p3.output.factor.value = x;
    }
  },
  {
    name: 'toms_start', type: 'hidden', min: 0, max: .1, value: 0, curve: 1,
    callback: x=>{
      synth.p1.startPoint= x
      synth.p2.startPoint= x
      synth.p3.startPoint= x
    }
  },
  {
    name: 'kick_rate', type: 'kick', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.kick.rate = x
  },
  {
    name: 'kick_decay', type: 'kick', min: 0, max: 1, value: 1, curve: 2,
    callback: x => synth.kick.decay = x *  synth.kick.duration
  },
  {
    name: 'snare_rate', type: 'snare', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.snare.rate = x
  },
  {
    name: 'snare_decay', type: 'snare', min: 0.01, max: 1, value: 1, curve: 2,
    callback: x => synth.snare.decay = x * synth.snare.duration
  },
  
  {
    name: 'dryKick', type: 'kick', min: 0, max: 1, value: 0, curve: 1,
    callback: x => synth.dry_kick.factor.value = x
  },
  {
    name: 'hat_rate', type: 'hihat', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.hat.rate = x
  },
  {
    name: 'closed_decay', type: 'hihat', min: 0.01, max: 1, value: 0.25, curve: 2,
    callback: x => synth.hat.choke = x
  },
  {
    name: 'open_decay', type: 'hihat', min: 0.01, max: 1, value: 1, curve: 2,
    callback: x => synth.hat.decay = x  * synth.snare.duration
  },
  {
    name: 'tom1_rate', type: 'toms', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.p1.rate = x
  },
  {
    name: 'tom2_rate', type: 'toms', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.p2.rate = x
  },
  {
    name: 'tom3_rate', type: 'toms', min: 0, max: 2, value: 1, curve: 1,
    callback: x => synth.p3.rate = x
  },
  {
    name: 'toms_decay', type: 'toms', min: 0.01, max: 1, value: 1, curve: 2,
    callback: x => {
      synth.p1.decay = x * synth.p1.duration;
      synth.p2.decay = x * synth.p2.duration;
      synth.p3.decay = x * synth.p3.duration;
    }
  },

  {
    name: 'comp_threshold', type: 'output', min: -60, max: -5, value: -5, curve: 1,
    callback: x => synth.comp.threshold.value = x
  },
  {
    name: 'comp_ratio', type: 'output', min: 1, max: 20, value: 1, curve: 1,
    callback: x => synth.comp.ratio.value = x
  },
  {
    name: 'gain', type: 'output', min: 0, max: 1, value: 0.2, curve: 1,
    callback: x => synth.distortion.distortion = x
  },
  {
    name: 'output_gain', type: 'output', min: 0, max: 4, value: 1, curve: 1,
    callback: x => synth.output.factor.value = x
  },
  // {
  //   name: 'drumkit', type: 'dropdown', value: synth.defaultKit || '', radioOptions: synth.drumkitList,
  //   callback: x => {
  //       console.log("dropdown load", x)
  //       synth.loadSamples(x)
  //   }
  // }
];

export default paramDefinitions;