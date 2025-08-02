function test_dct() {
	vector_length = 10
	input_space_upper = 10
	input = []
	output = []

	for (let i = 0; i < vector_length; i++) {
		const input_element = Math.random() * input_space_upper
		input.push(input_element)
	}

	output = dct(input)
}

function test_truncated_dct() {
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
}

test_dct()
test_truncated_dct()