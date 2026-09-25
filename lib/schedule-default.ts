import prisma from "@/lib/prisma";

export const DEFAULT_SCHEDULE = [
  // Понедельник (dayOfWeek: 1)
  { dayOfWeek: 1, startTime: "09:40", endTime: "10:25", subjectName: "Физкультура", roomNumber: "СПОРТ.ЗАЛ" },
  { dayOfWeek: 1, startTime: "10:30", endTime: "11:15", subjectName: "Английский язык", roomNumber: "312" },
  { dayOfWeek: 1, startTime: "11:20", endTime: "12:05", subjectName: "Узбекский язык", roomNumber: "303" },
  { dayOfWeek: 1, startTime: "12:10", endTime: "12:55", subjectName: "Литература", roomNumber: "311" },
  { dayOfWeek: 1, startTime: "13:15", endTime: "14:00", subjectName: "Химия", roomNumber: "204" },

  // Вторник (dayOfWeek: 2)
  { dayOfWeek: 2, startTime: "08:50", endTime: "09:35", subjectName: "Биология", roomNumber: "404" },
  { dayOfWeek: 2, startTime: "09:40", endTime: "10:25", subjectName: "Математика", roomNumber: "401" },
  { dayOfWeek: 2, startTime: "10:30", endTime: "11:15", subjectName: "Технология", roomNumber: "101(В)" },
  { dayOfWeek: 2, startTime: "11:20", endTime: "12:05", subjectName: "Физика", roomNumber: "203" },
  { dayOfWeek: 2, startTime: "12:10", endTime: "12:55", subjectName: "Химия", roomNumber: "204" },

  // Среда (dayOfWeek: 3)
  { dayOfWeek: 3, startTime: "09:40", endTime: "10:25", subjectName: "Английский язык", roomNumber: "205" },
  { dayOfWeek: 3, startTime: "10:30", endTime: "11:15", subjectName: "Русский язык", roomNumber: "311" },
  { dayOfWeek: 3, startTime: "11:20", endTime: "12:05", subjectName: "Математика", roomNumber: "401" },
  { dayOfWeek: 3, startTime: "12:10", endTime: "12:55", subjectName: "Физкультура", roomNumber: "СПОРТ.ЗАЛ" },

  // Четверг (dayOfWeek: 4)
  { dayOfWeek: 4, startTime: "09:40", endTime: "10:25", subjectName: "Литература", roomNumber: "311" },
  { dayOfWeek: 4, startTime: "10:30", endTime: "11:15", subjectName: "Технология", roomNumber: "101(В)" },
  { dayOfWeek: 4, startTime: "11:20", endTime: "12:05", subjectName: "Узбекский язык", roomNumber: "302" },
  { dayOfWeek: 4, startTime: "12:10", endTime: "12:55", subjectName: "Музыка", roomNumber: "104-Б" },
  { dayOfWeek: 4, startTime: "13:15", endTime: "14:00", subjectName: "Английский язык", roomNumber: "105" },

  // Пятница (dayOfWeek: 5)
  { dayOfWeek: 5, startTime: "09:40", endTime: "10:25", subjectName: "Биология", roomNumber: "404" },
  { dayOfWeek: 5, startTime: "10:30", endTime: "11:15", subjectName: "Узбекский язык", roomNumber: "310" },
  { dayOfWeek: 5, startTime: "11:20", endTime: "12:05", subjectName: "Математика", roomNumber: "401" },
  { dayOfWeek: 5, startTime: "12:10", endTime: "12:55", subjectName: "Физика", roomNumber: "203" },
  { dayOfWeek: 5, startTime: "13:15", endTime: "14:00", subjectName: "ИЗО", roomNumber: "304" },

  // Суббота (dayOfWeek: 6)
  { dayOfWeek: 6, startTime: "11:20", endTime: "12:05", subjectName: "Математика", roomNumber: "401" },
  { dayOfWeek: 6, startTime: "12:10", endTime: "12:55", subjectName: "Русский язык", roomNumber: "311" },
  { dayOfWeek: 6, startTime: "13:15", endTime: "14:00", subjectName: "Математика", roomNumber: "401" },
  { dayOfWeek: 6, startTime: "14:05", endTime: "14:50", subjectName: "Английский язык", roomNumber: "304" },
];

export async function seedDefaultSchedule() {
  const allSubjects = await prisma.subject.findMany();
  const allRooms = await prisma.classroom.findMany();

  const getOrCreateSubject = async (name: string) => {
    let s = allSubjects.find((x: any) => x.name.trim().toLowerCase() === name.toLowerCase());
    if (!s) {
      s = await prisma.subject.create({
        data: { name, shortName: name.slice(0, 8), color: "#308574" },
      });
      allSubjects.push(s);
    }
    return s.id;
  };

  const getOrCreateRoom = async (number: string) => {
    let r = allRooms.find((x: any) => x.number.trim().toLowerCase() === number.toLowerCase());
    if (!r) {
      r = await prisma.classroom.create({
        data: { number },
      });
      allRooms.push(r);
    }
    return r.id;
  };

  for (const item of DEFAULT_SCHEDULE) {
    const subjectId = await getOrCreateSubject(item.subjectName);
    const classroomId = await getOrCreateRoom(item.roomNumber);

    const exists = await prisma.scheduleLesson.findFirst({
      where: {
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        subjectId,
      },
    });

    if (!exists) {
      await prisma.scheduleLesson.create({
        data: {
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          subjectId,
          classroomId,
          isRecurring: true,
        },
      });
    }
  }
}
