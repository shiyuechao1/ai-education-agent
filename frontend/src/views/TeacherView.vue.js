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
const assignmentPickerBankId = ref();
const assignmentPickerQuestions = ref([]);
const selectedAssignmentQuestionIds = ref([]);
const selectedRecordAssignmentId = ref();
const submissionRecords = ref([]);
const gradingDrafts = ref({});
const sessions = ref([]);
const questionBanks = ref([]);
const selectedBankId = ref();
const selectedQuestionBankId = ref();
const bankQuestions = ref([]);
const feedback = ref({ rating: 5, content: '' });
const myFeedback = ref([]);
const lesson = ref({ topic: '', objectives: '', duration_minutes: 45 });
const lessonResult = ref(null);
const bank = ref({
    name: '默认题库',
    description: '',
    questions: [
        {
            type: 'choice',
            stem: '',
            options: [
                { label: 'A', text: '' },
                { label: 'B', text: '' }
            ],
            answer: '',
            analysis: '',
            score: 5
        }
    ]
});
const assignment = ref({ title: '', description: '', question_ids: '' });
const uploadEditable = ref(false);
const uploadFile = ref(null);
const selectedCourse = computed(() => courses.value.find((item) => item.id === courseId.value));
const selectedBank = computed(() => questionBanks.value.find((item) => item.id === selectedBankId.value));
const editingQuestion = computed(() => bank.value.questions[0]);
async function load() {
    const { data } = await api.get('/courses/my');
    courses.value = data;
    courseId.value = courseId.value || data[0]?.id;
    await refreshCourseData();
}
async function refreshCourseData() {
    if (!courseId.value)
        return;
    const [knowledgeRes, assignmentRes, sessionRes, bankRes] = await Promise.all([
        api.get(`/knowledge/${courseId.value}`),
        api.get(`/assignments/course/${courseId.value}`),
        api.get(`/qa/course/${courseId.value}/sessions`),
        api.get(`/assignments/banks/course/${courseId.value}`)
    ]);
    files.value = knowledgeRes.data;
    assignments.value = assignmentRes.data;
    sessions.value = sessionRes.data;
    questionBanks.value = bankRes.data;
    if (!questionBanks.value.some((item) => item.id === selectedBankId.value)) {
        selectedBankId.value = questionBanks.value[0]?.id;
    }
    if (!questionBanks.value.some((item) => item.id === selectedQuestionBankId.value)) {
        selectedQuestionBankId.value = questionBanks.value[0]?.id;
    }
    if (!questionBanks.value.some((item) => item.id === assignmentPickerBankId.value)) {
        assignmentPickerBankId.value = questionBanks.value[0]?.id;
    }
    await loadBankQuestions();
    await loadAssignmentPickerQuestions();
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
function relabelOptions() {
    editingQuestion.value.options = editingQuestion.value.options.map((option, index) => ({
        ...option,
        label: String.fromCharCode(65 + index)
    }));
}
function addChoiceOption() {
    editingQuestion.value.options.push({
        label: String.fromCharCode(65 + editingQuestion.value.options.length),
        text: ''
    });
}
function removeChoiceOption(index) {
    const removed = editingQuestion.value.options[index];
    editingQuestion.value.options.splice(index, 1);
    relabelOptions();
    if (editingQuestion.value.answer === removed?.label) {
        editingQuestion.value.answer = '';
    }
}
function setAnswer(answer) {
    editingQuestion.value.answer = answer;
}
function handleQuestionTypeChange() {
    editingQuestion.value.answer = '';
    if (editingQuestion.value.type === 'choice' && editingQuestion.value.options.length < 2) {
        editingQuestion.value.options = [
            { label: 'A', text: '' },
            { label: 'B', text: '' }
        ];
    }
}
async function createBank() {
    if (!courseId.value)
        return;
    const { data } = await api.post('/assignments/banks', {
        course_id: courseId.value,
        name: bank.value.name,
        description: bank.value.description,
        questions: []
    });
    bank.value.name = '';
    bank.value.description = '';
    selectedQuestionBankId.value = data.id;
    selectedBankId.value = data.id;
    await refreshCourseData();
}
async function addQuestionToSelectedBank() {
    if (!selectedQuestionBankId.value)
        return;
    const question = editingQuestion.value;
    await api.post(`/assignments/banks/${selectedQuestionBankId.value}/questions`, {
        ...question,
        options: question.type === 'choice' ? question.options : null
    });
    editingQuestion.value.stem = '';
    editingQuestion.value.answer = '';
    editingQuestion.value.analysis = '';
    editingQuestion.value.options = [
        { label: 'A', text: '' },
        { label: 'B', text: '' }
    ];
    await refreshCourseData();
}
async function deleteQuestionBank(bankId) {
    if (!window.confirm('确定删除该题库吗？未被作业使用的题目会一并删除。'))
        return;
    try {
        await api.delete(`/assignments/banks/${bankId}`);
        if (selectedBankId.value === bankId) {
            selectedBankId.value = undefined;
            bankQuestions.value = [];
        }
        if (selectedQuestionBankId.value === bankId) {
            selectedQuestionBankId.value = undefined;
        }
        await refreshCourseData();
    }
    catch (error) {
        alert(error?.response?.data?.detail || '删除题库失败');
    }
}
async function deleteQuestion(questionId) {
    if (!window.confirm('确定删除该题目吗？已被作业或作答记录使用的题目不能删除。'))
        return;
    try {
        await api.delete(`/assignments/questions/${questionId}`);
        await refreshCourseData();
    }
    catch (error) {
        alert(error?.response?.data?.detail || '删除题目失败');
    }
}
async function loadBankQuestions(bankId = selectedBankId.value) {
    if (!bankId) {
        bankQuestions.value = [];
        return;
    }
    selectedBankId.value = bankId;
    const { data } = await api.get(`/assignments/banks/${bankId}/questions`);
    bankQuestions.value = data;
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
function formatOptions(options) {
    if (!options?.length)
        return '无';
    return options.map((item) => `${item.label}. ${item.text}`).join('；');
}
async function createAssignment() {
    if (!courseId.value)
        return;
    await api.post('/assignments', {
        course_id: courseId.value,
        title: assignment.value.title,
        description: assignment.value.description,
        question_ids: selectedAssignmentQuestionIds.value
    });
    assignment.value.title = '';
    assignment.value.description = '';
    selectedAssignmentQuestionIds.value = [];
    await refreshCourseData();
}
async function loadAssignmentPickerQuestions(bankId = assignmentPickerBankId.value) {
    if (!bankId) {
        assignmentPickerQuestions.value = [];
        return;
    }
    assignmentPickerBankId.value = bankId;
    const { data } = await api.get(`/assignments/banks/${bankId}/questions`);
    assignmentPickerQuestions.value = data;
}
function toggleAssignmentQuestion(questionId) {
    if (selectedAssignmentQuestionIds.value.includes(questionId)) {
        selectedAssignmentQuestionIds.value = selectedAssignmentQuestionIds.value.filter((id) => id !== questionId);
        return;
    }
    selectedAssignmentQuestionIds.value = [...selectedAssignmentQuestionIds.value, questionId];
}
async function loadSubmissionRecords(assignmentId = selectedRecordAssignmentId.value) {
    if (!assignmentId) {
        submissionRecords.value = [];
        return;
    }
    selectedRecordAssignmentId.value = assignmentId;
    const { data } = await api.get(`/assignments/${assignmentId}/submissions/detail`);
    submissionRecords.value = data;
    const drafts = {};
    for (const record of data) {
        for (const answer of record.answers) {
            if (answer.type === 'short') {
                drafts[answer.answer_id] = {
                    score: answer.score || 0,
                    teacher_comment: answer.teacher_comment || ''
                };
            }
        }
    }
    gradingDrafts.value = drafts;
}
async function gradeShortAnswer(answer) {
    const draft = gradingDrafts.value[answer.answer_id];
    if (!draft)
        return;
    await api.put('/assignments/grade', {
        answer_id: answer.answer_id,
        score: Number(draft.score),
        teacher_comment: draft.teacher_comment
    });
    await loadSubmissionRecords();
}
async function openProtectedFile(url) {
    const apiPath = url.startsWith('/api') ? url.slice(4) : url;
    const { data } = await api.get(apiPath, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(data);
    window.open(objectUrl, '_blank');
}
function answerStatusText(answer) {
    if (answer.type === 'short' && (answer.is_correct === null || answer.is_correct === undefined))
        return '待批改';
    if (answer.is_correct === null || answer.is_correct === undefined)
        return '未判定';
    return answer.is_correct ? '正确' : '错误';
}
function answerStatusClass(answer) {
    return {
        success: answer.is_correct === true,
        danger: answer.is_correct === false
    };
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
else if (__VLS_ctx.feature === 'question-bank-create') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bank-create-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "例如：第一章基础题库",
    });
    (__VLS_ctx.bank.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.bank.description),
        placeholder: "输入题库适用章节、知识点范围或使用说明",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createBank) },
        type: "button",
        ...{ class: "bank-create-submit" },
    });
    const __VLS_12 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (16),
    }));
    const __VLS_14 = __VLS_13({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
else if (__VLS_ctx.feature === 'question-add') {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedQuestionBankId),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (undefined),
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.questionBanks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
        });
        (item.name);
        (item.question_count);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.handleQuestionTypeChange) },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "option-editor" },
        });
        for (const [option, index] of __VLS_getVForSourceType((__VLS_ctx.bank.questions[0].options))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (option.label),
                ...{ class: "option-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'lesson'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-create'))
                            return;
                        if (!(__VLS_ctx.feature === 'question-add'))
                            return;
                        if (!(__VLS_ctx.bank.questions[0].type === 'choice'))
                            return;
                        __VLS_ctx.setAnswer(option.label);
                    } },
                type: "button",
                ...{ class: "answer-option" },
                ...{ class: ({ selected: __VLS_ctx.bank.questions[0].answer === option.label }) },
            });
            (option.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                placeholder: (`选项 ${option.label} 内容`),
            });
            (option.text);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'lesson'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-create'))
                            return;
                        if (!(__VLS_ctx.feature === 'question-add'))
                            return;
                        if (!(__VLS_ctx.bank.questions[0].type === 'choice'))
                            return;
                        __VLS_ctx.removeChoiceOption(index);
                    } },
                type: "button",
                ...{ class: "secondary" },
                disabled: (__VLS_ctx.bank.questions[0].options.length <= 2),
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.addChoiceOption) },
            type: "button",
            ...{ class: "secondary" },
        });
        const __VLS_16 = {}.Plus;
        /** @type {[typeof __VLS_components.Plus, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            size: (18),
        }));
        const __VLS_18 = __VLS_17({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    }
    else if (__VLS_ctx.bank.questions[0].type === 'judge') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'courses'))
                        return;
                    if (!!(__VLS_ctx.feature === 'knowledge'))
                        return;
                    if (!!(__VLS_ctx.feature === 'lesson'))
                        return;
                    if (!!(__VLS_ctx.feature === 'question-bank-create'))
                        return;
                    if (!(__VLS_ctx.feature === 'question-add'))
                        return;
                    if (!!(__VLS_ctx.bank.questions[0].type === 'choice'))
                        return;
                    if (!(__VLS_ctx.bank.questions[0].type === 'judge'))
                        return;
                    __VLS_ctx.setAnswer('true');
                } },
            type: "button",
            ...{ class: "answer-option" },
            ...{ class: ({ selected: __VLS_ctx.bank.questions[0].answer === 'true' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'courses'))
                        return;
                    if (!!(__VLS_ctx.feature === 'knowledge'))
                        return;
                    if (!!(__VLS_ctx.feature === 'lesson'))
                        return;
                    if (!!(__VLS_ctx.feature === 'question-bank-create'))
                        return;
                    if (!(__VLS_ctx.feature === 'question-add'))
                        return;
                    if (!!(__VLS_ctx.bank.questions[0].type === 'choice'))
                        return;
                    if (!(__VLS_ctx.bank.questions[0].type === 'judge'))
                        return;
                    __VLS_ctx.setAnswer('false');
                } },
            type: "button",
            ...{ class: "answer-option" },
            ...{ class: ({ selected: __VLS_ctx.bank.questions[0].answer === 'false' }) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        placeholder: "分值",
    });
    (__VLS_ctx.bank.questions[0].score);
    if (__VLS_ctx.bank.questions[0].type === 'blank' || __VLS_ctx.bank.questions[0].type === 'short') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "参考答案",
        });
        (__VLS_ctx.bank.questions[0].answer);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selected-answer" },
        });
        (__VLS_ctx.bank.questions[0].answer || '请点击上方按钮设置');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.bank.questions[0].analysis),
        placeholder: "解析",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.addQuestionToSelectedBank) },
        disabled: (!__VLS_ctx.selectedQuestionBankId),
    });
    const __VLS_20 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (18),
    }));
    const __VLS_22 = __VLS_21({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
}
else if (__VLS_ctx.feature === 'question-bank-view') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.questionBanks.length);
    (__VLS_ctx.bankQuestions.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bank-manage-panel" },
    });
    if (__VLS_ctx.questionBanks.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bank-browser" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "bank-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.questionBanks))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'lesson'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-create'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-add'))
                            return;
                        if (!(__VLS_ctx.feature === 'question-bank-view'))
                            return;
                        if (!(__VLS_ctx.questionBanks.length))
                            return;
                        __VLS_ctx.loadBankQuestions(item.id);
                    } },
                key: (item.id),
                ...{ class: "bank-button" },
                ...{ class: ({ active: __VLS_ctx.selectedBankId === item.id }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.question_count);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'lesson'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-create'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-add'))
                            return;
                        if (!(__VLS_ctx.feature === 'question-bank-view'))
                            return;
                        if (!(__VLS_ctx.questionBanks.length))
                            return;
                        __VLS_ctx.deleteQuestionBank(item.id);
                    } },
                type: "button",
                ...{ class: "danger mini-button" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "question-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "bank-summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedBank?.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge success" },
        });
        (__VLS_ctx.selectedBank?.question_count || 0);
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [question] of __VLS_getVForSourceType((__VLS_ctx.bankQuestions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (question.id),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (question.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
            });
            (__VLS_ctx.questionTypeName(question.type));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (question.stem);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatOptions(question.options));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (question.answer);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (question.score);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (question.analysis || '无');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'lesson'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-create'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-add'))
                            return;
                        if (!(__VLS_ctx.feature === 'question-bank-view'))
                            return;
                        if (!(__VLS_ctx.questionBanks.length))
                            return;
                        __VLS_ctx.deleteQuestion(question.id);
                    } },
                type: "button",
                ...{ class: "danger" },
            });
        }
        if (!__VLS_ctx.bankQuestions.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
    }
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
        ...{ class: "assignment-builder" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selected-answer" },
    });
    (__VLS_ctx.selectedAssignmentQuestionIds.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createAssignment) },
        disabled: (!__VLS_ctx.assignment.title || !__VLS_ctx.selectedAssignmentQuestionIds.length),
    });
    const __VLS_24 = {}.Send;
    /** @type {[typeof __VLS_components.Send, ]} */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        size: (18),
    }));
    const __VLS_26 = __VLS_25({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "assignment-question-picker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "bank-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.questionBanks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'courses'))
                        return;
                    if (!!(__VLS_ctx.feature === 'knowledge'))
                        return;
                    if (!!(__VLS_ctx.feature === 'lesson'))
                        return;
                    if (!!(__VLS_ctx.feature === 'question-bank-create'))
                        return;
                    if (!!(__VLS_ctx.feature === 'question-add'))
                        return;
                    if (!!(__VLS_ctx.feature === 'question-bank-view'))
                        return;
                    if (!(__VLS_ctx.feature === 'assignments'))
                        return;
                    __VLS_ctx.loadAssignmentPickerQuestions(item.id);
                } },
            key: (item.id),
            ...{ class: "bank-button" },
            ...{ class: ({ active: __VLS_ctx.assignmentPickerBankId === item.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.question_count);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "question-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bank-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.questionBanks.find((item) => item.id === __VLS_ctx.assignmentPickerBankId)?.name || '暂无题库');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge success" },
    });
    if (__VLS_ctx.assignmentPickerQuestions.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "selectable-question-list" },
        });
        for (const [question] of __VLS_getVForSourceType((__VLS_ctx.assignmentPickerQuestions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.feature === 'courses'))
                            return;
                        if (!!(__VLS_ctx.feature === 'knowledge'))
                            return;
                        if (!!(__VLS_ctx.feature === 'lesson'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-create'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-add'))
                            return;
                        if (!!(__VLS_ctx.feature === 'question-bank-view'))
                            return;
                        if (!(__VLS_ctx.feature === 'assignments'))
                            return;
                        if (!(__VLS_ctx.assignmentPickerQuestions.length))
                            return;
                        __VLS_ctx.toggleAssignmentQuestion(question.id);
                    } },
                key: (question.id),
                type: "button",
                ...{ class: "selectable-question" },
                ...{ class: ({ selected: __VLS_ctx.selectedAssignmentQuestionIds.includes(question.id) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
            });
            (__VLS_ctx.questionTypeName(question.type));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (question.id);
            (question.stem);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (question.score);
            (question.answer);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
    }
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
else if (__VLS_ctx.feature === 'submission-records') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.submissionRecords.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (...[$event]) => {
                if (!!(__VLS_ctx.feature === 'courses'))
                    return;
                if (!!(__VLS_ctx.feature === 'knowledge'))
                    return;
                if (!!(__VLS_ctx.feature === 'lesson'))
                    return;
                if (!!(__VLS_ctx.feature === 'question-bank-create'))
                    return;
                if (!!(__VLS_ctx.feature === 'question-add'))
                    return;
                if (!!(__VLS_ctx.feature === 'question-bank-view'))
                    return;
                if (!!(__VLS_ctx.feature === 'assignments'))
                    return;
                if (!!(__VLS_ctx.feature === 'qa-history'))
                    return;
                if (!(__VLS_ctx.feature === 'submission-records'))
                    return;
                __VLS_ctx.loadSubmissionRecords(Number($event.target.value));
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
    if (__VLS_ctx.submissionRecords.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "submission-list" },
        });
        for (const [record] of __VLS_getVForSourceType((__VLS_ctx.submissionRecords))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (record.id),
                ...{ class: "submission-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "submission-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (record.student.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
            (record.student.user_no);
            (record.student.username);
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
                    ...{ class: (__VLS_ctx.answerStatusClass(answer)) },
                });
                (__VLS_ctx.answerStatusText(answer));
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
                                if (!!(__VLS_ctx.feature === 'lesson'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'question-bank-create'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'question-add'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'question-bank-view'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'assignments'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'qa-history'))
                                    return;
                                if (!(__VLS_ctx.feature === 'submission-records'))
                                    return;
                                if (!(__VLS_ctx.submissionRecords.length))
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
                (answer.analysis || '无');
                if (answer.type === 'short') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "grading-box" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                        type: "number",
                        min: "0",
                        max: (answer.max_score),
                        placeholder: "简答题得分",
                    });
                    (__VLS_ctx.gradingDrafts[answer.answer_id].score);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                        placeholder: "教师评语",
                    });
                    (__VLS_ctx.gradingDrafts[answer.answer_id].teacher_comment);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.feature === 'courses'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'knowledge'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'lesson'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'question-bank-create'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'question-add'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'question-bank-view'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'assignments'))
                                    return;
                                if (!!(__VLS_ctx.feature === 'qa-history'))
                                    return;
                                if (!(__VLS_ctx.feature === 'submission-records'))
                                    return;
                                if (!(__VLS_ctx.submissionRecords.length))
                                    return;
                                if (!(answer.type === 'short'))
                                    return;
                                __VLS_ctx.gradeShortAnswer(answer);
                            } },
                    });
                }
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
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
    const __VLS_28 = {}.MessageSquare;
    /** @type {[typeof __VLS_components.MessageSquare, ]} */ ;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
        size: (18),
    }));
    const __VLS_30 = __VLS_29({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
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
/** @type {__VLS_StyleScopedClasses['bank-create-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-create-submit']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['option-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['option-row']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-option']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-option']} */ ;
/** @type {__VLS_StyleScopedClasses['answer-option']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-manage-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-browser']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-button']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mini-button']} */ ;
/** @type {__VLS_StyleScopedClasses['question-list']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-builder']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-answer']} */ ;
/** @type {__VLS_StyleScopedClasses['assignment-question-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-list']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-button']} */ ;
/** @type {__VLS_StyleScopedClasses['question-list']} */ ;
/** @type {__VLS_StyleScopedClasses['bank-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['selectable-question-list']} */ ;
/** @type {__VLS_StyleScopedClasses['selectable-question']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['submission-list']} */ ;
/** @type {__VLS_StyleScopedClasses['submission-card']} */ ;
/** @type {__VLS_StyleScopedClasses['submission-header']} */ ;
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
/** @type {__VLS_StyleScopedClasses['grading-box']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
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
            assignmentPickerBankId: assignmentPickerBankId,
            assignmentPickerQuestions: assignmentPickerQuestions,
            selectedAssignmentQuestionIds: selectedAssignmentQuestionIds,
            submissionRecords: submissionRecords,
            gradingDrafts: gradingDrafts,
            sessions: sessions,
            questionBanks: questionBanks,
            selectedBankId: selectedBankId,
            selectedQuestionBankId: selectedQuestionBankId,
            bankQuestions: bankQuestions,
            feedback: feedback,
            myFeedback: myFeedback,
            lesson: lesson,
            lessonResult: lessonResult,
            bank: bank,
            assignment: assignment,
            uploadEditable: uploadEditable,
            uploadFile: uploadFile,
            selectedCourse: selectedCourse,
            selectedBank: selectedBank,
            refreshCourseData: refreshCourseData,
            uploadKnowledge: uploadKnowledge,
            generateLesson: generateLesson,
            addChoiceOption: addChoiceOption,
            removeChoiceOption: removeChoiceOption,
            setAnswer: setAnswer,
            handleQuestionTypeChange: handleQuestionTypeChange,
            createBank: createBank,
            addQuestionToSelectedBank: addQuestionToSelectedBank,
            deleteQuestionBank: deleteQuestionBank,
            deleteQuestion: deleteQuestion,
            loadBankQuestions: loadBankQuestions,
            questionTypeName: questionTypeName,
            formatOptions: formatOptions,
            createAssignment: createAssignment,
            loadAssignmentPickerQuestions: loadAssignmentPickerQuestions,
            toggleAssignmentQuestion: toggleAssignmentQuestion,
            loadSubmissionRecords: loadSubmissionRecords,
            gradeShortAnswer: gradeShortAnswer,
            openProtectedFile: openProtectedFile,
            answerStatusText: answerStatusText,
            answerStatusClass: answerStatusClass,
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
