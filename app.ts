import axios from "axios";
import * as dotenv from "dotenv";
import * as qs from "qs";
import * as ical from "ical-generator";
import * as moment from "moment";

dotenv.config();

interface JuLesson {
    code: string;
    name: string;
    moment: string;
    group: string;
    program: string;
    bolag: string;
    date: string;
    time: string;
    room: string;
    teacher: string;
    deleted: string;
    changed: string;
}

const baseUrl = "https://jumobile.win.hj.se/schedule/api";
const config = {
    headers: {
        "Content-Type": "application/x-www-form-urlencoded"
    }
};

const getValidationId = async (username, password) => {
    const requestBody = {
        pwd: password,
        callingSystem: "Android_2mZ8DrcLvuXh"
    };

    const res = await axios.post(
        baseUrl + "/loginStudent/v2/" + username,
        qs.stringify(requestBody),
        config
    );
    return res.data.validationId;
};

const getSchedule = async validationId => {
    const requestBody = {
        validationId
    };

    const res = await axios.post(
        baseUrl + "/getScheduleForStudent/v2/" + process.env.JU_USERNAME,
        qs.stringify(requestBody),
        config
    );
    return res.data.lessons as ReadonlyArray<JuLesson>;
};

(async () => {
    const validationId = await getValidationId(
        process.env.JU_USERNAME,
        process.env.JU_PASSWORD
    );

    const schedule = await getSchedule(validationId);

    const cal = ical({ name: "JU schedule", timezone: "Europe/Stockholm" });

    cal.events(
        schedule.map( juLesson => 
            ({
                start: moment(juLesson.date + " " + juLesson.time.split("-")[0], "YYYYMMDD HH:mm"),
                end: moment(juLesson.date + " " + juLesson.time.split("-")[1], "YYYYMMDD HH:mm"),
                summary: (juLesson.deleted == "YES" ? "[CANCELLED]" : "") + (juLesson.changed == "YES" ? "[NEW]" : "") + juLesson.name,
                description: juLesson.moment,
                location: juLesson.room,
                organizer: {
                    name: juLesson.teacher.split(",").map(teacher => teacher.split("#")[1]).join(","),
                    email: juLesson.teacher.split(",").map(teacher => teacher.split("#")[0]+"@ju.se").join(",")
                }
            })
        ) as Array<ical.EventData>
    );

    console.log(cal.toString())
})();
