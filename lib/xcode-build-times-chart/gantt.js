build_gantt_chart();

// We expect to have events here, so let's have them
console.log(raw_events);

function adgColor(taskName) {
    // ADG colors from https://atlassian.design/foundations/color
    const colors = {
        "N": {"300": "#5E6C84", "75": "#97A0AF", "800": "#172B4D"},
        "B": {"300": "#0065FF", "75": "#B3D4FF", "400": "#0052CC"},
        "R": {"300": "#FF5630", "75": "#FFBDAD"},
        "Y": {"300": "#FFAB00", "75": "#FFF0B3"},
        "G": {"300": "#36B37E", "75": "#ABF5D1"},
        "T": {"300": "#00B8D9", "75": "#B3F5FF"},
        "P": {"300": "#6554c0", "75": "#C0B6F2"},
    }
    
    let str = taskName;
    const suf = (suffix) => str.endsWith(suffix)
    const isTest = str.endsWith("Tests");
    if (isTest) {
      str = str.substring(0, (str.length - "Tests".length));
    }
    const c = (letter, num) => colors[letter][num] + (isTest ? "AA" : "FF")

    const defaultColor = "#C1C7D0"; // N50

    if (str === "JIRA")    { return c("N", "800") }
    if (str === "JIRAKit") { return c("N", "800") }
    if (suf("Resources"))   { return defaultColor }
    if (suf("Assets"))      { return defaultColor }

    if (suf("Domain"))      { return c("G", "300") }
    if (suf("Primitives"))  { return c("G", "300") }
    if (suf("Data"))        { return c("R", "300") }
    if (suf("Persistence")) { return c("R", "300") }
    if (suf("Feature"))     { return c("B", "300") }
    if (suf("UI"))          { return c("T", "300") }

    return defaultColor;
}

function transform_events_to_tasks(events) {
    var found_events_start = {};
    var found_events_ends = {};
    var tasks = [];
    for (var i = 0, l = events.length; i < l; i++) {
        var event = events[l - i - 1];
        console.log('[EVENT]' + JSON.stringify(event));
        var taskName = event.taskName;

        if (event.event === "end") {
            found_events_ends[taskName] = event
        } else if (event.event === "start") {

            // Let's stop, it's hardly we're building same target twice
            // If we want to
            if (taskName in found_events_start) {
                break;
            }

            end_event = found_events_ends[taskName];
            if (end_event === undefined) {
                end_event = event;
                console.log('[SKIP] ' + taskName + ' - start event before end ¯\\_(ツ)_/¯');
                break
            }

            found_events_start[taskName] = event;
            start_event = event;

            tasks.unshift({
                "startDate": new Date(start_event.date),
                "endDate": new Date(end_event.date),
                "taskName": taskName,
                "color": adgColor(taskName),
            })
        }
    }

    var names = tasks.map(task => task.taskName);
    return {
        "tasks": tasks,
        "names": names
    }
}

function build_gantt_chart() {

    var tasks_result = transform_events_to_tasks(raw_events);
    var tasks = tasks_result.tasks;

    tasks.sort(function (a, b) {
        return a.startDate - b.startDate;
    });
    var minDate = tasks[0].startDate;
    var maxDate = tasks[tasks.length - 1].endDate;

    var midinght = new Date(minDate);
    midinght.setHours(0, 0, 0, 0);

    var diff = minDate.getTime() - midinght.getTime();
    tasks.forEach(function (element, index) {
        tasks[index].startDate = new Date(element.startDate.getTime() - diff);
        tasks[index].endDate = new Date(element.endDate.getTime() - diff)
    });

    var totalTime = 0;
    tasks.forEach(function (element, index) {
        totalTime += tasks[index].endDate - tasks[index].startDate
    });

    const build_time = (maxDate - minDate)  / 1000;
    const compudataion_time = totalTime / 1000;
    const theoretical_minimum = compudataion_time / navigator.hardwareConcurrency;
    const theoretical_speedup = build_time / theoretical_minimum;
    const legend = [
        ['Build time', build_time],
        // ['Total computation time', compudataion_time],
        // ['Theoretical minimum', theoretical_minimum],
        // ['Theoretical speedup x', theoretical_speedup.toFixed(2)]
        ['Domain', 'green'],
        ['Data', 'red'],
        ['Feature', 'blue'],
        ['Jira & JIRATests', 'N800'],
        ['Other', 'gray'],
    ].map(function (t) {
        const title = t[0];
        const value = t[1] + '';
        return title.padEnd(22) + ' : ' + value.padStart(10)
    }).map(function (row) {
        return row.replace(/\s/g, '\u00A0');
    });


    console.log(legend);

    minDate = tasks[0].startDate;

    var max_time = 5 * 60 * 1000;

    var gantt = d3.gantt()
        .taskTypes(tasks_result.names)
        .tickFormat("%M:%S")
        .timeDomainMode("fixed")
        .timeDomain([minDate, new Date(minDate.getTime() + max_time)]);

    gantt(tasks, legend);

    var w = window;
    function updateWindow(){
        x = w.innerWidth || e.clientWidth || g.clientWidth;
        y = w.innerHeight|| e.clientHeight|| g.clientHeight;

        console.log("Gantt value " + gantt.margin);
        var margin = gantt.margin();
        gantt
            .width(x - margin.left - margin.right - 5)
            .height(y - margin.top - margin.bottom - 5)
            .redraw(tasks);
    }
    d3.select(window).on('resize.updatesvg', updateWindow);


};
