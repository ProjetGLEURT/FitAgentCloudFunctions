Date.prototype.addDays = function(days) {
    this.setDate( this.getDate()  + days);
    return this;
  };

function getIntervalPeriod(numNextWeek, period)
{
    var today = new Date();
    var days = new Array('Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'); 
    if(period == "week"){
        var conversionNumWeeks = new Array(6, 0, 1, 2, 3, 4, 5)
        trueNumDay = conversionNumWeeks[today.getDay()]
        begin = new Date();
        end = new Date();
        begin.addDays(-trueNumDay+numNextWeek*7);
        end.addDays(7-trueNumDay+numNextWeek*7);
        end.setHours(1, 0, 0);
        return {begin, end}
    }
    else{
        let nbDaysMonth = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
        begin = new Date();
        end = new Date( );
        end.addDays(nbDaysMonth[today.getMonth()]);
        end.addDays( - today.getDate() +1);
        end.setHours(1, 0, 0);
        return {begin, end}
    }
}


console.log(getIntervalPeriod(1, "week"))

var a = new Date()
console.log('là', a.toISOString())
a.getTime()
a.setTime(a.getTime() + 300*60*1000)
console.log(a)