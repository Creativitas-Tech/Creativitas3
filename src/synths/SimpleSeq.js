export class SimpleSeq{
	constructor(value=0, number = 10){
		this.numSeqs = number
		this.seq = new Array(this.numSeqs).fill(value)
	}
	get(num=0,index=0){
		num = num % this.numSeqs
		if(Array.isArray( this.seq[num] )){
			return this.seq[num][index%this.seq[num].length]
		} else {
			return this.seq[num]
		}
	}
	set(num, val){ this.seq[num] = val}
	setAll(val) {this.seq = new Array(this.numSeqs).fill(val)}

	set val (x){this.setAll(x)}
	get val (){return this.seq[0]}
	set value (x){ this.setAll(x) }
}