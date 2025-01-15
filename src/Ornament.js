let _ = -123456
export function orn (note, pattern=1, scalar=1, length=4){
	const patts = [
		[0,1,2,3],
		[0,2,1,3],
		[0,1,-1,0],
		[1,0,-1,0],
		[1,'.','.',0],
		[1,0,'.','.'],
		['.',0,0,0],
		['.',0,'.',0]

	]
	let arr = []
	pattern = pattern % patts.length
	for(let i=0;i<length;i++){
		arr.push( note + patts[pattern][i]*scalar)
	}
	return arr
}