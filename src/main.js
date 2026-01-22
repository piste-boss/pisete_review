document.addEventListener('DOMContentLoaded', () => {
	const beginnerBtn = document.querySelector('[data-tier="beginner"]')
	const intermediateBtn = document.querySelector('[data-tier="intermediate"]')

	if (beginnerBtn) {
		beginnerBtn.addEventListener('click', () => {
			window.location.assign('./form1/')
		})
	}

	if (intermediateBtn) {
		intermediateBtn.addEventListener('click', () => {
			window.location.assign('./form2/')
		})
	}
})