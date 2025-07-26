function test_dct() {
	//console.log("Testing dct()")
	vector_length = 10
	input_space_upper = 10
	input = []
	output = []

	for (let i = 0; i < vector_length; i++) {
		const input_element = Math.random() * input_space_upper
		input.push(input_element)
	}

	output = dct(input)

	//console.log("Input:")
	//console.log(input)

	//console.log("Output:")
	//console.log(output)
	//console.log("--------------------")
}

function test_truncated_dct() {
	//console.log("Testing truncated_dct()")
	vector_length = 10
	input_space_upper = 10
	truncated_length = 5
	input = []
	output = []

	for (let i = 0; i < vector_length; i++) {
		const input_element = Math.random() * input_space_upper
		input.push(input_element)
	}

	output = truncated_dct(input, truncated_length)

	//console.log("Input:")
	//console.log(input)

	//console.log("Output:")
	//console.log(output)
	//console.log("--------------------")
}

test_dct()
test_truncated_dct()