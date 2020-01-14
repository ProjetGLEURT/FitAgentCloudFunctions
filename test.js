
const {HttpClient} = require('./functions/dialogflowFirebaseFulfillment/httpRequest')

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
        start = new Date();
        end = new Date();
        start.addDays(-trueNumDay+numNextWeek*7);
        end.addDays(7-trueNumDay+numNextWeek*7);
        end.setHours(1, 0, 0);
        return {start, end}
    }
    else{
        let nbDaysMonth = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
        start = new Date();
        end = new Date( );
        end.addDays(nbDaysMonth[today.getMonth()]);
        end.addDays( - today.getDate() +1);
        end.setHours(1, 0, 0);
        return {start, end}
    }
}


function sectionningFreeTimesPossible(freeTimesPossible, eventDuration)
{
    var sectionFreeTimesPossible = []
    var possibleSectionning;
    var secure=0;
    var initEnd

    for(let i=0;i<freeTimesPossible.length;i++)
    {
        possibleSectionning = true
        initEnd = new Date(freeTimesPossible[i].end)
        while(possibleSectionning && secure < 10)
        {
            let start = new Date(freeTimesPossible[i].start)
            let end = new Date(freeTimesPossible[i].end)
            let potentialNewEnd =new Date(start)
            potentialNewEnd.setTime(start.getTime() + eventDuration*60*1000)
            sectionFreeTimesPossible.push({start:start, end:potentialNewEnd})
            if((initEnd - potentialNewEnd)< 0)
            {
                possibleSectionning = false
            }
            else
            {
                freeTimesPossible[i].start = new Date(potentialNewEnd)
            }
            secure++;

        }
    }

    return sectionFreeTimesPossible
}






bbb = new Array()
/*bbb.push(getIntervalPeriod(1, "week"))
bbb.push(getIntervalPeriod(2, "week"))
bbb.push(getIntervalPeriod(3, "week"))*/
bbb.push(getIntervalPeriod(3, "month"))
/*
var a = new Date()
console.log('là', a.toISOString())
a.getTime()
a.setTime(a.getTime() + 300*60*1000)
console.log(a)
var b = new Date()
console.log(a-b)
console.log(Date.parse(a))
console.log(a)

let eventDuration = 23*60;
*/

/*console.log(bbb)
Promise.resolve(sectionningF*/

var datetest = new Date()




function dateFormatForApi(date)
{
    let stringConversionMonth = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
    let stringConversionDay = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
    '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31']
    let chaineDate = date.getFullYear() + '-' + stringConversionMonth[date.getMonth()] + '-' + stringConversionDay[date.getDate()] + ' 13:00:00';
    console.log(chaineDate)
    
    return chaineDate;
}


let client = new HttpClient()
client.get(`https://www.infoclimat.fr/public-api/gfs/json?_ll=44.8333,-0.5667
&_auth=CBJQR1MtAyFRfAYxVSNVfAVtDjsBdwcgVChQM1g9AH0CaVAxAGBRNwBuVSgDLAQyAC0EZww3BzcBalYuWykHZghiUDxTOANkUT4GY1V6VX4FKw5vASEHIFQ%2FUDdYKwBiAmBQPAB9UTIAalU0Ay0EMQA2BGIMLAcgAWNWNFsxB2wIYlAwUzQDYlE%2BBm1VelV%2BBTMOOwE%2FB2xUZFAwWDYAZgJnUDMAZlE0AG5VNgMtBDAANgRnDDMHPgFiVjRbPgd7CHRQTVNDA3xRfgYmVTBVJwUrDjsBYAdr&_c=0741890848ffe9f18aca8160e26719c8`
, async res => {
    console.log("Response of the request api meteo");
    resJson = JSON.parse(res)
    console.log(resJson[dateFormatForApi(datetest)].pluie);
    return 1;
});