module.exports = {
	time: {
		simulation: [
			new Date('11/3/2019').getTime(),
			new Date('12/1/2019').getTime()
		],
		real: [
			new Date('11/6/2016').getTime(),
			new Date('12/4/2016').getTime()
		],
		checkpoints: [
			new Date('11/3/2019').getTime(),
			new Date('11/10/2019').getTime(),
			new Date('11/17/2019').getTime(),
			new Date('11/24/2019').getTime(),
			new Date('12/1/2019').getTime()
		]
	},
	waitCostMean: 3.75,
	waitCostSpan: 1.50,
	powerZoneCost: 5.25
}