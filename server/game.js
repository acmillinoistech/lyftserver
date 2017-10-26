module.exports = {
    time: {
        simulation: [
    		new Date('10/1/2017').getTime(),
    		new Date('10/7/2017').getTime()
    	],
    	real: [
    		new Date('10/1/2016').getTime(),
    		new Date('10/7/2016').getTime()
    	],
    	checkpoints: [
    		new Date('10/1/2017').getTime(),
    		new Date('10/8/2017').getTime(),
    		new Date('10/15/2017').getTime(),
    		new Date('10/22/2017').getTime()
    	]        
    },
    waitCostMean: 3.00,
    waitCostSpan: 2.50,
    powerZoneCost: 2.75
}