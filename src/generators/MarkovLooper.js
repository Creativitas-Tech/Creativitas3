class MarkovLooper{
  constructor(){
    this.parameter = []
    //class variables

    this.reset()
  }
  recordingFunction = ()=>{
    //keeping track of beats and pushing events to training data
  }

   record(){
    if (!isLoop){
      makeLoop()
      isLoop = true
    }
    state = 'recording'
  }

   addEvent = (event)=>{
    if(state == 'recording'){
      events.push(event)
    }
  }

  train = ()=>{
    trainModel()
    isTrained = true
  }

  get = ()=>{
    return getEvent()
  }

}
