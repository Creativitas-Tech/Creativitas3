let _ = -123456
export function orn (note, pattern=1, scalar=1, length=4){
    // TODO: Ask Ian why
    // Check if the note is a string in the format of a note name (e.g., C4, D#3)
    if (typeof note === 'string' && /^[A-Ga-g][#b]?\d/.test(note)) {
        // For note names, just return the original note without ornamentation
        return [note];
    }

	note = Number(note)
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
		arr.push( note + patts[pattern][i%patts[pattern].length]*scalar)
	}
	return arr
}
