/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { Download, FileUp, MessageSquare, Plus, Send, Wand2 } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api/client';
const route = useRoute();
const feature = computed(() => String(route.params.feature || 'courses'));
const courses = ref([]);
const courseId = ref();
const files = ref([]);
const assignments = ref([]);
const sessions = ref([]);
const feedback = ref({ rating: 5, content: '' });
const lesson = ref({ topic: '', objectives: '', duration_minutes: 45 });
const lessonResult = ref(null);
const optionText = ref('A. 选项一\nB. 选项二');
const bank = ref({
    name: '默认题库',
    questions: [{ type: 'choice', stem: '', options: [], answer: '', analysis: '', score: 5 }]
});
const assignment = ref({ title: '', description: '', question_ids: '' });
const uploadEditable = ref(false);
const uploadFile = ref(null);
const selectedCourse = computed(() => courses.value.find((item) => item.id === courseId.value));
async function load() {
    const { data } = await api.get('/courses/my');
    courses.value = data;
    courseId.value = courseId.value || data[0]?.id;
    await refreshCourseData();
}
async function refreshCourseData() {
    if (!courseId.value)
        return;
    const [knowledgeRes, assignmentRes, sessionRes] = await Promise.all([
        api.get(`/knowledge/${courseId.value}`),
        api.get(`/assignments/course/${courseId.value}`),
        api.get(`/qa/course/${courseId.value}/sessions`)
    ]);
    files.value = knowledgeRes.data;
    assignments.value = assignmentRes.data;
    sessions.value = sessionRes.data;
}
async function uploadKnowledge() {
    if (!courseId.value || !uploadFile.value)
        return;
    const form = new FormData();
    form.append('file', uploadFile.value);
    await api.post(`/knowledge/${courseId.value}/upload?editable_by_students=${uploadEditable.value}`, form);
    uploadFile.value = null;
    await refreshCourseData();
}
async function generateLesson() {
    if (!courseId.value)
        return;
    const { data } = await api.post('/ai/lesson-plan', { course_id: courseId.value, ...lesson.value });
    lessonResult.value = data;
}
function parseOptions() {
    return optionText.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        const [label, ...rest] = line.split(/[.、]/);
        return { label: label.trim(), text: rest.join('.').trim() };
    });
}
async function createBank() {
    if (!courseId.value)
        return;
    const payload = {
        course_id: courseId.value,
        name: bank.value.name,
        questions: [{ ...bank.value.questions[0], options: parseOptions() }]
    };
    await api.post('/assignments/banks', payload);
    bank.value.questions[0].stem = '';
    bank.value.questions[0].answer = '';
    bank.value.questions[0].analysis = '';
}
async function createAssignment() {
    if (!courseId.value)
        return;
    await api.post('/assignments', {
        course_id: courseId.value,
        title: assignment.value.title,
        description: assignment.value.description,
        question_ids: assignment.value.question_ids.split(',').map((id) => Number(id.trim())).filter(Boolean)
    });
    assignment.value.title = '';
    assignment.value.question_ids = '';
    await refreshCourseData();
}
async function sendFeedback() {
    await api.post('/feedback', feedback.value);
    feedback.value.content = '';
}
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.feature === 'courses') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.courses.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.refreshCourseData) },
        value: (__VLS_ctx.courseId),
    });
    for (const [course] of __VLS_getVForSourceType((__VLS_ctx.courses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (course.id),
            value: (course.id),
        });
        (course.name);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedCourse?.name || '暂无课程');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.selectedCourse?.description || '选择课程后，其他功能将围绕当前课程执行。');
}
else if (__VLS_ctx.feature === 'knowledge') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.files.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (...[$event]) => {
                if (!!(__VLS_ctx.feature === 'courses'))
                    return;
                if (!(__VLS_ctx.feature === 'knowledge'))
                    return;
                __VLS_ctx.uploadFile = $event.target.files?.[0] || null;
            } },
        type: "file",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.uploadEditable);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.uploadKnowledge) },
    });
    const __VLS_0 = {}.FileUp;
    /** @type {[typeof __VLS_components.FileUp, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (18),
    }));
    const __VLS_2 = __VLS_1({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [file] of __VLS_getVForSourceType((__VLS_ctx.files))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (file.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (file.filename);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge" },
            ...{ class: ({ success: file.indexed }) },
        });
        (file.indexed ? '已索引' : '未索引');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (`/api/knowledge/${__VLS_ctx.courseId}/download/${file.id}`),
        });
        const __VLS_4 = {}.Download;
        /** @type {[typeof __VLS_components.Download, ]} */ ;
        // @ts-ignore
        const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
            size: (16),
        }));
        const __VLS_6 = __VLS_5({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    }
}
else if (__VLS_ctx.feature === 'lesson') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "课程主题",
    });
    (__VLS_ctx.lesson.topic);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.lesson.objectives),
        placeholder: "教学目标",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
    });
    (__VLS_ctx.lesson.duration_minutes);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.generateLesson) },
    });
    const __VLS_8 = {}.Wand2;
    /** @type {[typeof __VLS_components.Wand2, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (18),
    }));
    const __VLS_10 = __VLS_9({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.lessonResult || '生成结果将在这里展示');
}
else if (__VLS_ctx.feature === 'question-bank') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack compact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "题库名称",
    });
    (__VLS_ctx.bank.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.bank.questions[0].type),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "choice",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "blank",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "judge",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "short",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.bank.questions[0].stem),
        placeholder: "题干",
    });
    if (__VLS_ctx.bank.questions[0].type === 'choice') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.optionText),
            placeholder: "每行一个选项，如 A. 选项",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        placeholder: "分值",
    });
    (__VLS_ctx.bank.questions[0].score);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "参考答案",
    });
    (__VLS_ctx.bank.questions[0].answer);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.bank.questions[0].analysis),
        placeholder: "解析",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createBank) },
    });
    const __VLS_12 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (18),
    }));
    const __VLS_14 = __VLS_13({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
else if (__VLS_ctx.feature === 'assignments') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.assignments.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid two" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "作业标题",
    });
    (__VLS_ctx.assignment.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.assignment.description),
        placeholder: "作业说明",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "题目 ID，用英文逗号分隔",
    });
    (__VLS_ctx.assignment.question_ids);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createAssignment) },
    });
    const __VLS_16 = {}.Send;
    /** @type {[typeof __VLS_components.Send, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (18),
    }));
    const __VLS_18 = __VLS_17({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.assignments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (item.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.created_at);
    }
}
else if (__VLS_ctx.feature === 'qa-history') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.sessions.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [session] of __VLS_getVForSourceType((__VLS_ctx.sessions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (session.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (session.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (session.created_at);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (`/api/qa/sessions/${session.id}/export`),
        });
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack compact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "1",
        max: "5",
    });
    (__VLS_ctx.feedback.rating);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.feedback.content),
        placeholder: "向管理员反馈系统体验",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.sendFeedback) },
    });
    const __VLS_20 = {}.MessageSquare;
    /** @type {[typeof __VLS_components.MessageSquare, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (18),
    }));
    const __VLS_22 = __VLS_21({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
}
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['check-line']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Download: Download,
            FileUp: FileUp,
            MessageSquare: MessageSquare,
            Plus: Plus,
            Send: Send,
            Wand2: Wand2,
            feature: feature,
            courses: courses,
            courseId: courseId,
            files: files,
            assignments: assignments,
            sessions: sessions,
            feedback: feedback,
            lesson: lesson,
            lessonResult: lessonResult,
            optionText: optionText,
            bank: bank,
            assignment: assignment,
            uploadEditable: uploadEditable,
            uploadFile: uploadFile,
            selectedCourse: selectedCourse,
            refreshCourseData: refreshCourseData,
            uploadKnowledge: uploadKnowledge,
            generateLesson: generateLesson,
            createBank: createBank,
            createAssignment: createAssignment,
            sendFeedback: sendFeedback,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
