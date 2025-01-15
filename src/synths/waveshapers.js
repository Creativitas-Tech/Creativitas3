export function hardClip(value){
  return Math.max(Math.min(value*4,1),-1)
}
export function softClip(value){
  return Math.tanh(value*4) 
}
export function hardSync(value){
  value *= 8
  if(value > 0) return value%1 
  else if (value <0) return Math.abs(value)%1*-1 
  else return 0
}
export function pwm(x){
  //return x
  //x = Math.pow(Math.abs(x/2+.5),.5)
 // x=Math.abs(x)<.3 ? .25*Math.sign(x): x
  //console.log(x)
  return x > .05 ? 1 : -1;
}
export function sawToTri(value){
  value *= 2.3
  if(Math.abs(value) <= 1) return value
  if(value > 1) return 2-value
  if (value < -1) return -2-value 
}
export function triangleFolder(value){
  value = Math.abs(value*8 + 0.5)
  if( Math.floor(value%2) == 0 ) {
    return (value%1) * 2 - 1
  } else{
    return (1 - (value%1)) * 2 - 1
  }
}
export function sineFolder(value){
  return Math.sin(value * Math.PI * 8);
}
export function pseudorandom(value){
  let seed = (Math.abs(value)-.0)*7
  const pseudoRandom = ((seed * 9187543225 + 12345) % 4294967296) / 4294967296;
  return pseudoRandom * 2 - 1
}