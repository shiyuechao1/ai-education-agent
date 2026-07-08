/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { CheckCircle2, Download, FileUp, MessageSquare, Send, Sparkles } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api/client';
const route = useRoute();
const feature = computed(() => String(route.params.feature || 'courses'));
const courses = ref([]);
const courseId = ref();
const files = ref([]);
const assignments = ref([]);
const selectedAssignmentId = ref();
const questions = ref([]);
const current = ref(0);
const answers = ref({});
const answerImages = ref({});
const answerFileNames = ref({});
const submissionResult = ref(null);
const submissionHistory = ref([]);
const qa = ref({ question: '', answer: '', session_id: undefined });
const recommend = ref({ knowledge_point: '', result: null });
const feedback = ref({ rating: 5, content: '' });
const myFeedback = ref([]);
const uploadFile = ref(null);
const selectedCourse = computed(() => courses.value.find((item) => item.id === courseId.value));
async function load() {
    const { data } = await api.get('/courses/my');
    courses.value = data;
    courseId.value = data[0]?.id;
    await refreshCourseData();
}
async function refreshCourseData() {
    if (!courseId.value)
        return;
    const [knowledgeRes, assignmentRes] = await Promise.all([
        api.get(`/knowledge/${courseId.value}`),
        api.get(`/assignments/course/${courseId.value}`)
    ]);
    files.value = knowledgeRes.data;
    assignments.value = assignmentRes.data;
    await loadSubmissionHistory();
}
async function uploadKnowledge() {
    if (!courseId.value || !uploadFile.value)
        return;
    const form = new FormData();
    form.append('file', uploadFile.value);
    await api.post(`/knowledge/${courseId.value}/upload`, form);
    uploadFile.value = null;
    await refreshCourseData();
}
async function ask() {
    if (!courseId.value || !qa.value.question)
        return;
    const { data } = await api.post('/qa/ask', {
        course_id: courseId.value,
        question: qa.value.question,
        session_id: qa.value.session_id
    });
    qa.value.answer = data.answer;
    qa.value.session_id = data.session_id;
}
async function loadQuestions(assignmentId) {
    selectedAssignmentId.value = assignmentId;
    const { data } = await api.get(`/assignments/${assignmentId}/questions`);
    questions.value = data;
    current.value = 0;
    answers.value = {};
    answerImages.value = {};
    answerFileNames.value = {};
    submissionResult.value = null;
}
async function submitAssignment() {
    if (!selectedAssignmentId.value)
        return;
    const { data } = await api.post('/assignments/submit', {
        assignment_id: selectedAssignmentId.value,
        answers: questions.value.map((question) => ({
            question_id: question.id,
            content: answers.value[question.id] || '',
            image_path: answerImages.value[question.id] || undefined
        }))
    });
    submissionResult.value = data;
    await loadSubmissionHistory();
}
async function uploadShortAnswerFile(questionId, event) {
    const file = event.target.files?.[0];
    if (!file)
        return;
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/assignments/answer-upload', form);
    answerImages.value[questionId] = data.image_path;
    answerFileNames.value[questionId] = data.filename;
}
async function openProtectedFile(url) {
    const apiPath = url.startsWith('/api') ? url.slice(4) : url;
    const { data } = await api.get(apiPath, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(data);
    window.open(objectUrl, '_blank');
}
async function recommendQuestions() {
    if (!courseId.value)
        return;
    const { data } = await api.post('/ai/recommend-questions', {
        course_id: courseId.value,
        knowledge_point: recommend.value.knowledge_point
    });
    recommend.value.result = data;
}
async function sendFeedback() {
    await api.post('/feedback', feedback.value);
    feedback.value.content = '';
    await loadMyFeedback();
}
async function loadMyFeedback() {
    const { data } = await api.get('/feedback/my');
    myFeedback.value = data;
}
async function loadSubmissionHistory() {
    if (!courseId.value) {
        submissionHistory.value = [];
        return;
    }
    const { data } = await api.get(`/assignments/my-submissions/course/${courseId.value}`);
    submissionHistory.value = data;
}
function answered(questionId) {
    return Boolean(answers.value[questionId]);
}
function questionTypeName(type) {
    const names = {
        choice: '选择题',
        blank: '填空题',
        judge: '判断题',
        short: '简答题'
    };
    return names[type] || type;
}
function resultStatusText(result) {
    if (result.is_correct === null || result.is_correct === undefined)
        return '待教师批改';
    return result.is_correct ? '正确' : '错误';
}
function resultStatusClass(result) {
    return {
        success: result.is_correct === true,
        danger: result.is_correct === false
    };
}
onMounted(async () => {
    await load();
    await loadMyFeedback();
});
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
    (__VLS_ctx.selectedCourse?.description || '选择课程后即可浏览知识库、答题和提问。');
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
        const __VLS_0 = {}.Download;
        /** @type {[typeof __VLS_components.Download, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            size: (16),
        }));
        const __VLS_2 = __VLS_1({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack compact" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.uploadKnowledge) },
    });
    const __VLS_4 = {}.FileUp;
    /** @type {[typeof __VLS_components.FileUp, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (18),
    }));
    const __VLS_6 = __VLS_5({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
}
else if (__VLS_ctx.feature === 'qa') {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.qa.question),
        placeholder: "向课程知识库提问",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.ask) },
    });
    const __VLS_8 = {}.Send;
    /** @type {[typeof __VLS_components.Send, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (18),
    }));
    const __VLS_10 = __VLS_9({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "answer-box" },
    });
    (__VLS_ctx.qa.answer || '回答会显示在这里。');
}
else if (__VLS_ctx.feature === 'assignment') {
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
        ...{ class: "toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                if (!!(__VLS_ctx.feature === 'courses'))
                    return;
                if (!!(__VLS_ctx.feature === 'knowledge'))
                    return;
                if (!!(__VLS_ctx.feature === 'qa'))
                    return;
                if (!(__VLS_ctx.feature === 'assignment'))
                    return;
                __VLS_ctx.loadQuestions(Number($event.target.value));
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.assignments))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
        });
        (item.title);
    }
    if (__VLS_ctx.selectedAssignmentId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.submitAssignment) },
        });
        const __VLS_12 = {}.CheckCircle2;
        /** @type {[typeof __VLS_components.CheckCircle2, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (18),
        }));
        const __VLS_14 = __VLS_13({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
    if (__VLS_ctx.questions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "answer-layout" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "question-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.current + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.questions[__VLS_ctx.current].stem);
        if (__VLS_ctx.questions[__VLS_ctx.current].type === 'choice') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-stack" },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.questions[__VLS_ctx.current].options || []))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.feature === 'courses'))
                                return;
                            if (!!(__VLS_ctx.feature === 'knowledge'))
                                return;
                            if (!!(__VLS_ctx.feature === 'qa'))
                                return;
                            if (!(__VLS_ctx.feature === 'assignment'))
                                return;
                            if (!(__VLS_ctx.questions.length))
                                return;
                            if (!(__VLS_ctx.questions[__VLS_ctx.current].type === 'choice'))
                                return;
                            __VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id] = option.label;
                        } },
                    key: (option.label),
                    ...{ class: "answer-option" },
                    ...{ class: ({ selected: __VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id] === option.label }) },
                });
                (option.label);
                (option.text);
            }
        }
        else if (__VLS_ctx.questions[__VLS_ctx.current].type === 'judge') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'qa'))
                            return;
                        if (!(__VLS_ctx.feature === 'assignment'))
                            return;
                        if (!(__VLS_ctx.questions.length))
                            return;
                        if (!!(__VLS_ctx.questions[__VLS_ctx.current].type === 'choice'))
                            return;
                        if (!(__VLS_ctx.questions[__VLS_ctx.current].type === 'judge'))
                            return;
                        __VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id] = 'true';
                    } },
                ...{ class: "answer-option" },
                ...{ class: ({ selected: __VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id] === 'true' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'qa'))
                            return;
                        if (!(__VLS_ctx.feature === 'assignment'))
                            return;
                        if (!(__VLS_ctx.questions.length))
                            return;
                        if (!!(__VLS_ctx.questions[__VLS_ctx.current].type === 'choice'))
                            return;
                        if (!(__VLS_ctx.questions[__VLS_ctx.current].type === 'judge'))
                            return;
                        __VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id] = 'false';
                    } },
                ...{ class: "answer-option" },
                ...{ class: ({ selected: __VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id] === 'false' }) },
            });
        }
        else if (__VLS_ctx.questions[__VLS_ctx.current].type === 'blank') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ class: "answer-input" },
                ...{ class: ({ selected: __VLS_ctx.answered(__VLS_ctx.questions[__VLS_ctx.current].id) }) },
                placeholder: "请输入填空题答案",
            });
            (__VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id]);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
                value: (__VLS_ctx.answers[__VLS_ctx.questions[__VLS_ctx.current].id]),
                placeholder: "简答题可填写说明，并上传图片或文件",
            });
        }
        if (__VLS_ctx.questions[__VLS_ctx.current].type === 'short') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "upload-box" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'qa'))
                            return;
                        if (!(__VLS_ctx.feature === 'assignment'))
                            return;
                        if (!(__VLS_ctx.questions.length))
                            return;
                        if (!(__VLS_ctx.questions[__VLS_ctx.current].type === 'short'))
                            return;
                        __VLS_ctx.uploadShortAnswerFile(__VLS_ctx.questions[__VLS_ctx.current].id, $event);
                    } },
                type: "file",
            });
            if (__VLS_ctx.answerFileNames[__VLS_ctx.questions[__VLS_ctx.current].id]) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge success" },
                });
                (__VLS_ctx.answerFileNames[__VLS_ctx.questions[__VLS_ctx.current].id]);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'courses'))
                        return;
                    if (!!(__VLS_ctx.feature === 'knowledge'))
                        return;
                    if (!!(__VLS_ctx.feature === 'qa'))
                        return;
                    if (!(__VLS_ctx.feature === 'assignment'))
                        return;
                    if (!(__VLS_ctx.questions.length))
                        return;
                    __VLS_ctx.current--;
                } },
            ...{ class: "secondary" },
            disabled: (__VLS_ctx.current === 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'courses'))
                        return;
                    if (!!(__VLS_ctx.feature === 'knowledge'))
                        return;
                    if (!!(__VLS_ctx.feature === 'qa'))
                        return;
                    if (!(__VLS_ctx.feature === 'assignment'))
                        return;
                    if (!(__VLS_ctx.questions.length))
                        return;
                    __VLS_ctx.current++;
                } },
            ...{ class: "secondary" },
            disabled: (__VLS_ctx.current === __VLS_ctx.questions.length - 1),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "question-map" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "question-index" },
        });
        for (const [question, index] of __VLS_getVForSourceType((__VLS_ctx.questions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'qa'))
                            return;
                        if (!(__VLS_ctx.feature === 'assignment'))
                            return;
                        if (!(__VLS_ctx.questions.length))
                            return;
                        __VLS_ctx.current = index;
                    } },
                key: (question.id),
                ...{ class: ({ done: __VLS_ctx.answered(question.id) }) },
            });
            (index + 1);
        }
    }
    if (__VLS_ctx.submissionResult) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "section-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.submissionResult.total_score);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "table" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.submissionResult.answers))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (item.question_id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
            });
            (__VLS_ctx.questionTypeName(item.type));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (item.stem);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.student_answer || '未作答');
            if (item.image_path) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.feature === 'courses'))
                                return;
                            if (!!(__VLS_ctx.feature === 'knowledge'))
                                return;
                            if (!!(__VLS_ctx.feature === 'qa'))
                                return;
                            if (!(__VLS_ctx.feature === 'assignment'))
                                return;
                            if (!(__VLS_ctx.submissionResult))
                                return;
                            if (!(item.image_path))
                                return;
                            __VLS_ctx.openProtectedFile(item.image_path);
                        } },
                    ...{ class: "secondary" },
                    type: "button",
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (item.reference_answer);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
                ...{ class: ({ success: item.is_correct === true, danger: item.is_correct === false }) },
            });
            (__VLS_ctx.resultStatusText(item));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (item.score);
            (item.max_score);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (item.analysis || '无');
        }
    }
    if (!__VLS_ctx.questions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
    }
}
else if (__VLS_ctx.feature === 'submission-history') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.submissionHistory.length);
    if (__VLS_ctx.submissionHistory.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "submission-list" },
        });
        for (const [record] of __VLS_getVForSourceType((__VLS_ctx.submissionHistory))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (record.id),
                ...{ class: "submission-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "submission-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (record.assignment_title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
            (record.assignment_description || '无作业说明');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
            (record.submitted_at);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "score-pill" },
            });
            (record.total_score);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "answer-records" },
            });
            for (const [answer] of __VLS_getVForSourceType((record.answers))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                    key: (answer.answer_id),
                    ...{ class: "answer-record" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "answer-record-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge" },
                });
                (__VLS_ctx.questionTypeName(answer.type));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge" },
                    ...{ class: (__VLS_ctx.resultStatusClass(answer)) },
                });
                (__VLS_ctx.resultStatusText(answer));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (answer.score);
                (answer.max_score);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "question-stem" },
                });
                (answer.stem);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "answer-meta" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (answer.student_answer || '未作答');
                if (answer.image_path) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.feature === 'courses'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'knowledge'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'qa'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'assignment'))
                                    return;
                                if (!(__VLS_ctx.feature === 'submission-history'))
                                    return;
                                if (!(__VLS_ctx.submissionHistory.length))
                                    return;
                                if (!(answer.image_path))
                                    return;
                                __VLS_ctx.openProtectedFile(answer.image_path);
                            } },
                        ...{ class: "secondary" },
                        type: "button",
                    });
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (answer.reference_answer);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (answer.teacher_comment || (answer.type === 'short' ? '教师暂未批阅' : '自动判分'));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "reply-box" },
                });
                (answer.analysis || '无');
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
    }
}
else if (__VLS_ctx.feature === 'recommendation') {
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
        placeholder: "输入知识点",
    });
    (__VLS_ctx.recommend.knowledge_point);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.recommendQuestions) },
    });
    const __VLS_16 = {}.Sparkles;
    /** @type {[typeof __VLS_components.Sparkles, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        size: (18),
    }));
    const __VLS_18 = __VLS_17({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.recommend.result || '推荐结果将在这里展示');
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "feedback-history" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    if (__VLS_ctx.myFeedback.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "feedback-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.myFeedback))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (item.id),
                ...{ class: "feedback-record" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "feedback-record-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
            });
            (item.rating);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "muted" },
            });
            (item.created_at);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.content);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "reply-box" },
            });
            (item.reply || '暂未回复');
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-box']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['question-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-option']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-option']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-option']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-input']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-box']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['question-map']} */ ;
/** @type {__VLS_StyleScopedClasses['question-index']} */ ;
/** @type {__VLS_StyleScopedClasses['result-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['submission-list']} */ ;
/** @type {__VLS_StyleScopedClasses['submission-card']} */ ;
/** @type {__VLS_StyleScopedClasses['submission-header']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['score-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-records']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-record']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-record-head']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['question-stem']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-box']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['two']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-history']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-list']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-record']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-record-head']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-box']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            CheckCircle2: CheckCircle2,
            Download: Download,
            FileUp: FileUp,
            MessageSquare: MessageSquare,
            Send: Send,
            Sparkles: Sparkles,
            feature: feature,
            courses: courses,
            courseId: courseId,
            files: files,
            assignments: assignments,
            selectedAssignmentId: selectedAssignmentId,
            questions: questions,
            current: current,
            answers: answers,
            answerFileNames: answerFileNames,
            submissionResult: submissionResult,
            submissionHistory: submissionHistory,
            qa: qa,
            recommend: recommend,
            feedback: feedback,
            myFeedback: myFeedback,
            uploadFile: uploadFile,
            selectedCourse: selectedCourse,
            refreshCourseData: refreshCourseData,
            uploadKnowledge: uploadKnowledge,
            ask: ask,
            loadQuestions: loadQuestions,
            submitAssignment: submitAssignment,
            uploadShortAnswerFile: uploadShortAnswerFile,
            openProtectedFile: openProtectedFile,
            recommendQuestions: recommendQuestions,
            sendFeedback: sendFeedback,
            answered: answered,
            questionTypeName: questionTypeName,
            resultStatusText: resultStatusText,
            resultStatusClass: resultStatusClass,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
