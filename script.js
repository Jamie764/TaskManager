const newTaskBtn=document.getElementById("new_task_btn");
const cancelBtn=document.getElementById("cancelBtn");
const removeBtn=document.getElementById("removeBtn");
const taskEditor=document.getElementById("task_editor");
const completedTasksList=document.getElementById("completed_tasks");
const outstandingTasksList=document.getElementById("outstanding_tasks");
const timelineBlocksContainer = document.getElementById("timeline_blocks");
//This object represents a dictionary of Task objects.
//When adding new tasks, I'll add a new property with key = unique task ID, and value of the Task object
let taskDictionary={};

//Getting reference to the form inputs (as we'll need their values to create a task)
const inputName=document.getElementById("task_name");
const inputDecription=document.getElementById("task_description");
const inputStart=document.getElementById("task_start");
const inputEnd=document.getElementById("task_end");
const submitBtn=document.getElementById("submitBtn");

// ! WIP:  WHEN I DEAL WITH LOADING STUFF FROM LOCAL STORAGE -> I MAY NEED TO HANDLE DATES THAT ARE NO LONGER VALID (IE: THEY'RE TOO LONG AGO)
//Bind dates to between January of this year and December of next year
const currentAndNextYear = [new Date().getFullYear(), new Date().getFullYear()+1];
let minDate = currentAndNextYear[0] + "-01-01";
let maxDate = currentAndNextYear[1] + "-12-31";
inputStart.setAttribute("max",maxDate);
inputStart.setAttribute("min",minDate);
inputEnd.setAttribute("max",maxDate);
inputEnd.setAttribute("min",minDate);

//Get current date in the format of date inputs (and tomorrow's date as well)
let currentDate=new Date();
let tomorrowDate = new Date();
tomorrowDate.setDate(currentDate.getDate()+1);
currentDate = `${currentDate.getFullYear()}-${currentDate.getMonth()+1}-${currentDate.getDate()}`;
tomorrowDate = `${tomorrowDate.getFullYear()}-${tomorrowDate.getMonth()+1}-${tomorrowDate.getDate()}`;

//Setup an array for timeline management
//The idea is that this will be a 2d array where each entry is a size 3 array containing: start date, end date, task object
let timelineManager = [];

//Retrieve previous data
const getStoredData = localStorage.getItem("data");
if(getStoredData){
    taskDictionary=JSON.parse(getStoredData);
}

for(const id in taskDictionary){
    //Validate dates in taskDictionary (eg: If min date has now increased since last use and now a task's date is invalid)
    taskValidateDates(taskDictionary[id]);
    //Update the html (this is just to ensure that an outstanding task might be converted to late if deadline has passed)
    taskUpdateHTML(taskDictionary[id]);
    //Add saved tasks to timelineManager
    addTaskToTimeline(taskDictionary[id]);
}


//Create new task when clicking the button (we pass in null for the task input to create a new task)
newTaskBtn.onclick=()=>{taskCreationOrEdit(null)};
cancelBtn.onclick=()=>{cancelCreationOrEdit()};
//Set the escape key to cancel editing of information or task creation
document.addEventListener("keydown", (event) => {
    if(event.key==="Escape"){
        cancelCreationOrEdit();
    }
});

//Setup the static timeline html 
const datesSection = document.getElementById("dates");
const dateSectionHeight=100;
datesSection.style.height = `${dateSectionHeight}px`;
datesSection.innerHTML="";
//timeline length might change depending on if there's a leap year or not, so we keep track of it
let totalTimelineLength=0;
//Contains 2 sets of months that cover the 2 year span we're looking at
let months = [["January",31],["February",28],["March",31],["April",30],["May",31],["June",30],["July",31],["August",31],["September",30],["October",31],["November",30],["December",31]
        ,["January",31],["February",28],["March",31],["April",30],["May",31],["June",30],["July",31],["August",31],["September",30],["October",31],["November",30],["December",31]];
//Update the february days if we have a leap year
if(checkLeapYear(currentAndNextYear[0])){
    months[1][1] = 29;
    datesSection.style.width = `calc((365 * 2 + 1) * var(--dayBlockWidth) + 24*var(--timelineMonthBlockBorder))`;
}else if(checkLeapYear(currentAndNextYear[1])){
    months[13][1] = 29;
    datesSection.style.width = `calc((365 * 2 + 1) * var(--dayBlockWidth) + 24*var(--timelineMonthBlockBorder))`;
}else{
    datesSection.style.width = `calc(365 * 2 * var(--dayBlockWidth) + 24*var(--timelineMonthBlockBorder))`;
}
//Setup the timeline banner html
for(let j=0;j<months.length;j++){
    let i=1;
    if(j<12){
        i=0;
    }
    let daysString="";
    for(let z=0;z<months[j][1];z++){
        daysString+=`<p>${z+1}</p>`;
        totalTimelineLength++;
    }
    //Add all of the html for this month
    datesSection.innerHTML+=`<div class="monthBlock">
                <div class="monthTitle"><h3>${months[j][0]} - ${currentAndNextYear[i]}</h3></div>
                <div class="days">${daysString}</div>
            </div>`;
}


//Multiplying the timeline length by the pixel width of each day block in css (NOTE: It's important this number matches the css --dayBlockWidth)
const dayBlockWidth=30;
//These numbers must also match the css
const timelineMonthBlockBorder=1;
const timelineTaskHeight=50;
totalTimelineLength*=dayBlockWidth;


//Finally, display the initial data in the html
updateTaskHTML();
//Start the timeline at today's position
document.getElementById("timeline").scroll({top:0, left: convertDateToPosition(currentDate) - document.getElementById("timeline").offsetWidth/2, behavior: "instant"});
//Set centre timeline button functionality
document.getElementById("centreTimeline").onclick=()=>{
    document.getElementById("timeline").scroll({top:0, left: convertDateToPosition(currentDate) - document.getElementById("timeline").offsetWidth/2, behavior: "smooth"});
};



// !!! This is the end of stuff that happens initially when page loads






function checkLeapYear(year){
    //We check if the 29th February of input year is still February and not March
    return new Date(year,1,29).getMonth()===1;
}


//What to do when user clicks submit when creating a new task
function submitNewTask(){
    //Logic to setup a new task 
    //Create the inner html for the task block for outstanding task
    // NOTE: Date.now() will generate a unique id IF it's not run twice in the same millisecond. Since users can't submit 2 forms within a millisecond, I think it's safe.
    const uniqueID = Date.now();
    //Create new Task
    let task = new Task(inputName.value, inputDecription.value, inputStart.value, inputEnd.value, false, uniqueID);
    //Store the task in the dictionary
    taskDictionary[`${uniqueID}`]=task;
    //Hide the display
    taskEditor.classList.add("hide");

    //Add the task to the timeline
    addTaskToTimeline(task);

    //Update the innerHTML of oustanding tasks list and timeline
    updateTaskHTML();

    //Save the data
    localStorage.setItem("data", JSON.stringify(taskDictionary));
}

//What to do when user clicks submit when editing a new task
function submitEditTask(task){
    //Logic to edit an existing task

    //Assign all the input values to the task
    task.name=inputName.value;
    task.description=inputDecription.value;
    task.start=inputStart.value;
    task.end=inputEnd.value;

    //Validate dates
    taskValidateDates(task);
    //Update the html
    taskUpdateHTML(task);
    //Immediately reflect the changes in the html section as well
    document.getElementById(`${task.listBlockID}_name`).innerText=task.name;
    document.getElementById(`${task.timelineBlockID}_name`).innerText=task.name;

    //Hide the display
    taskEditor.classList.add("hide");

    //Add the task to the timeline
    addTaskToTimeline(task);

    //Save the data
    localStorage.setItem("data", JSON.stringify(taskDictionary));
}

//Option to remove task, which should only appear when editing existing task
function removeTask(task){
    //delete task from dictionary
    delete taskDictionary[task.uniqueID];
    //delete task from timelineManager
    removeTaskFromTimelineManager(task);
    //Save the data
    localStorage.setItem("data", JSON.stringify(taskDictionary));
    updateTaskHTML();
    //Close the edit window
    cancelCreationOrEdit();
}

//The function that is executed when clicking on the new task button. Displays the task editor panel set up for new tasks.
function taskCreationOrEdit(task){
    //Display the panel for creating new task
    taskEditor.classList.remove("hide");

    if(task === null){
        //Define what to do when user submits the task editor form when we want to create a new task
        // NOTE: We're doing onsubmit rather than addEventListener because this way we reset previous onsubmits as well instead of stacking them
        taskEditor.onsubmit=(event)=>{event.preventDefault();
            submitNewTask();
        };

        //Hide delete button
        removeBtn.classList.add("hide");

        //Reset default values for entries
        inputName.value="";
        inputDecription.value="";
        //Set default values for start date to be today, and end date to be tomorrow
        inputStart.value= currentDate;
        inputEnd.value=tomorrowDate;
        submitBtn.value="Create Task";
    }else{
        //Define what to do when user submits the task editor form when we want to edit an existing task
        taskEditor.onsubmit=(event)=>{event.preventDefault();
            submitEditTask(task);
        };

        //Show delete button and set the onclick event
        removeBtn.classList.remove("hide");
        removeBtn.onclick=()=>{removeTask(task);}

        //Fill in current values for inputs
        inputName.value=task.name;
        inputDecription.value=task.description;
        inputStart.value=task.start;
        inputEnd.value=task.end;
        submitBtn.value="Edit Task";
    }
}

//Cancel the editing/creation of tasks
function cancelCreationOrEdit(){
    taskEditor.classList.add("hide");
}

// NOTE: It is the duty of the caller of this method that the input task's dates are valid
function addTaskToTimeline(task){
    //Remove task from timeline if it already exists
    removeTaskFromTimelineManager(task);

    //Try to fit the task into an existing row in the timelineManager
    let successfulPlacement = false;
    for(let i=0;i<timelineManager.length;i++){
        let conflict = false;
        //We want each row to be sorted by start date, so the placementIndex keeps track of where we place the new entry
        let placementIndex=-1;
        for(let j=0;j<timelineManager[i].length;j++){
            //Check if the task at position i,j conflicts with the new task 
            //(it isn't a conflict if both start and end dates are before existing start date, or if new start date is after existing end date)
            if(!(task.start >= timelineManager[i][j][1] || (task.start <= timelineManager[i][j][0] && task.end <= timelineManager[i][j][0]))){
                //In this case the new task conflicts with existing one, so we move to next row
                conflict = true;
                break;
            }
            //We make note of the first existing task that starts after the new input task
            if(timelineManager[i][j][0] > task.start && placementIndex<0){
                placementIndex=j;
            }
            //Check if we're past the time-frame we care about (ie: exisiting start date is after the input task's end date)
            if(timelineManager[i][j][0] > task.end){
                break;
            }
        }
        //If we've finished checking the current row and didn't encounter a conflict
        if(!conflict){
            if(placementIndex<0){
                //In this case, the new task should be added to the end of the current row
                timelineManager[i].push([task.start,task.end,task]);
            }else{
                //Else, we place the new task at the specified placement index
                timelineManager[i].splice(placementIndex,0,[task.start,task.end,task]);
            }
            successfulPlacement =true;
            break;
        }
    }

    //If we weren't successful in adding the task to an existing row, we add a new row and place the new task in it
    if(!successfulPlacement){
        timelineManager.push([[task.start,task.end,task]]);
    }
}

function removeTaskFromTimelineManager(task){
    let x=-1;
    let y=-1;
    removalLoop: for(let i=0;i<timelineManager.length;i++){
        for(let j=0; j<timelineManager[i].length;j++){
            if(timelineManager[i][j][2] === task){
                x = i;
                y=j;
                break removalLoop;
            }
        }
    }
    if(x >= 0 && y >= 0){
        timelineManager[x].splice(y,1);
    }
}


// NOTE: We don't want this class to have any methods, because then it can't be saved into local storage
class Task{
    constructor(name, description, start, end, completed, uniqueID){
        this.name=name;
        this.description=description;
        this.start=start;
        this.end=end;
        this.completed=completed;
        this.uniqueID=uniqueID;
        this.listBlockID=`taskList_${uniqueID}`;
        this.timelineBlockID=`taskTimeline_${uniqueID}`;

        taskValidateDates(this);
        taskUpdateHTML(this);
    }
}

//These next 2 functions I wanted to be within the task class, but that lead to issues
//Updates the stored string data for the input task's corresponding html elements
//  In particular, it handles whether the task is displayed as late,outstanding,or completed based on the input task's parameters
function taskUpdateHTML(task){
    if(!task.completed){
        //Check whether this task is outstanding or late
        let status_class="outstanding_task";
        //This way we ensure that if end date is not set, it doesn't show up as late
        if(task.end && task.end < currentDate){
            status_class="late_task";
        }

        task.outstandingTaskBlockHTML=`<div class="task_block ${status_class}" id="${task.listBlockID}"><h3 id="${task.listBlockID}_name">${task.name}</h3>
                <button id="${task.listBlockID}_completionToggle" class="completion_btn">Incomplete</button>
                <button id="${task.listBlockID}_edit" class="edit_btn">Edit</button></div>`;
        task.completedTaskBlockHTML=``;
        task.timelineTaskBlockHTML=`<div class="timeline_block ${status_class}" id="${task.timelineBlockID}"><h3 id="${task.timelineBlockID}_name">${task.name}</h3></div>`;
    }else{
        task.outstandingTaskBlockHTML=``;
        task.completedTaskBlockHTML=`<div class="task_block completed_task" id="${task.listBlockID}"><h3 id="${task.listBlockID}_name">${task.name}</h3>
                <button id="${task.listBlockID}_completionToggle" class="completion_btn">Complete</button>
                <button id="${task.listBlockID}_edit" class="edit_btn">Edit</button></div>`;
        task.timelineTaskBlockHTML=`<div class="timeline_block completed_task" id="${task.timelineBlockID}"><h3 id="${task.timelineBlockID}_name">${task.name}</h3></div>`;
    }
}
//Ensures the input task's dates are valid
//eg of invalid dates: if end date is before start date; If any dates are less than the min value (we don't need to check max value because we can't travel backwards in time)
function taskValidateDates(task){
    if(task.start < minDate){
        task.start = minDate;
    }
    if(task.end< minDate){
        task.end = minDate;
    }
    if(task.end <= task.start){
        //A task must end at least one day after the start day
        let nextDay = new Date(task.start);
        nextDay.setDate(nextDay.getDate()+1);
        let month = nextDay.getMonth()+1;
        //Ensuring single digits have a zero in front of them so it's the correct format
        if(month<10){
            month=`0${month}`;
        }
        let day=nextDay.getDate();
        if(day<10){
            day = `0${day}`;
        }
        task.end = `${nextDay.getFullYear()}-${month}-${day}`;
    }
}



//Update the html document to reflect the html properties of all tasks
function updateTaskHTML(){

    //Clear existing html
    outstandingTasksList.innerHTML ="";
    completedTasksList.innerHTML="";

    //For all tasks...
    for(const id in taskDictionary){
        //Update the outstanding tasks html
        outstandingTasksList.innerHTML+=taskDictionary[id].outstandingTaskBlockHTML;
        completedTasksList.innerHTML+=taskDictionary[id].completedTaskBlockHTML;
    }

    //Have to do this stuff in a seperate loop to avoid wierdness
    for(const id in taskDictionary){
        //Assign the correct onclick function to the edit button
        document.getElementById(`${taskDictionary[id].listBlockID}_edit`).onclick=()=>{taskCreationOrEdit(taskDictionary[id]);};
        document.getElementById(`${taskDictionary[id].listBlockID}_completionToggle`).onclick=()=>{
            taskDictionary[id].completed = !taskDictionary[id].completed;
            taskUpdateHTML(taskDictionary[id]);
            localStorage.setItem("data", JSON.stringify(taskDictionary));
            updateTaskHTML();
        };
    }


    //Update the html of the timeline too
    updateTimelineHTML();
}


//Update the html inside the timeline according to the timelineManager array
function updateTimelineHTML(){
    timelineBlocksContainer.innerHTML = ``;

    //Add the html
    for(let i=0;i<timelineManager.length;i++){
        for(let j=0;j<timelineManager[i].length;j++){
            timelineBlocksContainer.innerHTML+=timelineManager[i][j][2].timelineTaskBlockHTML;
        }
    }

    //Adjust the values of the html
    for(let i=0;i<timelineManager.length;i++){
        for(let j=0;j<timelineManager[i].length;j++){
            const element=document.getElementById(timelineManager[i][j][2].timelineBlockID);
            const startPos = convertDateToPosition(timelineManager[i][j][2].start);
            const endPos = convertDateToPosition(timelineManager[i][j][2].end);
            //Set the width and position of the element
            element.style.width = `${endPos-startPos}px`;
            element.style.left = `${startPos}px`;
            element.style.top = `${dateSectionHeight + timelineTaskHeight*i}px`;
            //Set events
            element.onmouseenter=(event)=>{
                //Highlight the hovered task and scroll to it in the task list
                element.classList.add("hovered_task");
                const element2=document.getElementById(timelineManager[i][j][2].listBlockID);
                if(element2){
                    element2.classList.add("hovered_task");
                }

                //Show description if there is one
                if(timelineManager[i][j][2].description){
                    const descriptionBlock=document.getElementById("description_block");
                    descriptionBlock.classList.remove("hide");
                    if(event.clientX > window.innerWidth*0.5){
                        descriptionBlock.style.right = (window.innerWidth - event.clientX + 20) + "px";
                        descriptionBlock.style.left = "auto";
                    }else{
                        descriptionBlock.style.left = (event.clientX + 20) + "px";
                        descriptionBlock.style.right = "auto";
                    }
                    descriptionBlock.style.bottom = (window.innerHeight - event.clientY) + "px";
                    document.getElementById("description_title").innerText=timelineManager[i][j][2].name;
                    document.getElementById("description_description").innerText=timelineManager[i][j][2].description;
                }
            };
            element.onmouseleave=()=>{
                element.classList.remove("hovered_task");
                const element2=document.getElementById(timelineManager[i][j][2].listBlockID);
                if(element2){
                    element2.classList.remove("hovered_task");
                }

                document.getElementById("description_block").classList.add("hide");
            }
            //We scroll the element into view when we click on it (because doing it on hover would be awkward for tasks surrounded by other tasks)
            element.onclick=()=>{
                const element2=document.getElementById(timelineManager[i][j][2].listBlockID);
                if(element2){
                    element2.scrollIntoView({behavior: "smooth",block: "center"});
                }
            }
        }
    }
}

//Converts the input date in the format "2024-12-31" to the corresponding position along the timeline
function convertDateToPosition(dateString){
    //Technically this will fail once we reach the year 10000 a.d but I doubt that will be an issue
    const year = parseInt(dateString.substring(0,4));
    const month = parseInt(dateString.substring(5,7));
    const day = parseInt(dateString.substring(8));

    let index=month-1;
    if(year > currentAndNextYear[0]){
        //If the year is not the current year, then add 12 to the index to move it to next year
        index+=12;
    }

    let totalDays=day;
    //Add up the days leading up till our current month
    for(let i=0;i<index;i++){
        totalDays+=months[i][1];
    }

    //First term is calculating the position based on how many days since the start of timeline
    //2nd term is adding a little bit to account for the borders around the month blocks in the html
    //3rd term is offsetting so we end up in the middle of the correct day, rather than at the end of it
    return totalDays*dayBlockWidth + timelineMonthBlockBorder*index - 0.5*dayBlockWidth;
}