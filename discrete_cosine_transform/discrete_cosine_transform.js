function dct(x) {
	var output = []

	for (let k = 0; k < x.length; k++) {
		var numerator = 0
		if (k == 0) {
			numerator = 1
		} else {
			numerator = 2
		}
		const norm = numerator / Math.sqrt(x.length)

		var sum = 0
		for(let n = 0; n < x.length; n++) {
			const waveX = n + 0.5
			const doubleFrequency = k / x.length
			const angle = waveX * Math.PI * doubleFrequency
			const sumPart = x[n] * Math.cos(angle)

			sum += sumPart
		}

		const normalizedSum = norm * sum

		output.push(normalizedSum)
	}

	return output
}

function truncated_dct(x, truncated_length) {
    const output = dct(x)
    const truncated_output = output.slice(0, truncated_length)
    return truncated_output
}