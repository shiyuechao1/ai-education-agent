/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { MessageSquareReply, Plus, RefreshCcw, UserPlus } from 'lucide-vue-next';
import * as echarts from 'echarts';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api/client';
const route = useRoute();
const feature = computed(() => String(route.params.feature || 'create-user'));
const users = ref([]);
const courses = ref([]);
const feedback = ref([]);
const stats = ref({});
const userForm = ref({
    username: '',
    name: '',
    role: 'student',
    entry_year: 2026,
    password: '',
    confirm_password: ''
});
const courseForm = ref({
    name: '',
    description: '',
    teacher_id: undefined,
    student_ids: []
});
const teachers = computed(() => users.value.filter((item) => item.role === 'teacher'));
const students = computed(() => users.value.filter((item) => item.role === 'student'));
async function load() {
    const [userRes, courseRes, feedbackRes, statRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/courses'),
        api.get('/admin/feedback'),
        api.get('/analytics/dashboard')
    ]);
    users.value = userRes.data;
    courses.value = courseRes.data;
    feedback.value = feedbackRes.data;
    stats.value = statRes.data;
    await renderChartIfNeeded();
}
async function createUser() {
    await api.post('/admin/users', userForm.value);
    userForm.value.username = '';
    userForm.value.name = '';
    userForm.value.password = '';
    userForm.value.confirm_password = '';
    await load();
}
async function createCourse() {
    await api.post('/admin/courses', {
        name: courseForm.value.name,
        description: courseForm.value.description,
        teacher_id: Number(courseForm.value.teacher_id),
        student_ids: courseForm.value.student_ids
    });
    courseForm.value.name = '';
    courseForm.value.student_ids = [];
    await load();
}
function toggleStudent(studentId) {
    const selected = courseForm.value.student_ids;
    if (selected.includes(studentId)) {
        courseForm.value.student_ids = selected.filter((id) => id !== studentId);
        return;
    }
    courseForm.value.student_ids = [...selected, studentId];
}
async function reply(item) {
    await api.put(`/admin/feedback/${item.id}/reply`, { reply: item.reply });
    await load();
}
async function renderChartIfNeeded() {
    if (feature.value !== 'dashboard')
        return;
    await nextTick();
    const node = document.getElementById('dashboard-chart');
    if (!node)
        return;
    const chart = echarts.getInstanceByDom(node) || echarts.init(node);
    chart.setOption({
        color: ['#146c94', '#2f8f5b'],
        grid: { top: 30, right: 20, bottom: 40, left: 40 },
        tooltip: {},
        xAxis: { type: 'category', data: Object.keys(stats.value), axisLabel: { rotate: 25 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', barWidth: 28, data: Object.values(stats.value) }]
    });
}
watch(feature, renderChartIfNeeded);
onMounted(load);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.feature === 'create-user') {
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
        placeholder: "用户名",
    });
    (__VLS_ctx.userForm.username);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "姓名",
    });
    (__VLS_ctx.userForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.userForm.role),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "teacher",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "student",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
    });
    (__VLS_ctx.userForm.entry_year);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "password",
        placeholder: "登录密码",
    });
    (__VLS_ctx.userForm.password);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "password",
        placeholder: "确认密码",
    });
    (__VLS_ctx.userForm.confirm_password);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createUser) },
    });
    const __VLS_0 = {}.UserPlus;
    /** @type {[typeof __VLS_components.UserPlus, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        size: (18),
    }));
    const __VLS_2 = __VLS_1({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else if (__VLS_ctx.feature === 'create-course') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.teachers.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-stack compact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "课程名称",
    });
    (__VLS_ctx.courseForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.courseForm.description),
        placeholder: "课程描述，可选",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.courseForm.teacher_id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (undefined),
    });
    for (const [user] of __VLS_getVForSourceType((__VLS_ctx.teachers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (user.id),
            value: (user.id),
        });
        (user.name);
        (user.user_no);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "student-picker" },
    });
    for (const [student] of __VLS_getVForSourceType((__VLS_ctx.students))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'create-user'))
                        return;
                    if (!(__VLS_ctx.feature === 'create-course'))
                        return;
                    __VLS_ctx.toggleStudent(student.id);
                } },
            key: (student.id),
            type: "button",
            ...{ class: "student-option" },
            ...{ class: ({ active: __VLS_ctx.courseForm.student_ids.includes(student.id) }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (student.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (student.user_no);
        (student.username);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createCourse) },
    });
    const __VLS_4 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        size: (18),
    }));
    const __VLS_6 = __VLS_5({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
}
else if (__VLS_ctx.feature === 'dashboard') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.load) },
        ...{ class: "secondary" },
    });
    const __VLS_8 = {}.RefreshCcw;
    /** @type {[typeof __VLS_components.RefreshCcw, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        size: (18),
    }));
    const __VLS_10 = __VLS_9({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "metric-grid" },
    });
    for (const [value, key] of __VLS_getVForSourceType((__VLS_ctx.stats))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (key),
            ...{ class: "metric-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (key);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (value);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: "dashboard-chart",
        ...{ class: "chart" },
    });
}
else if (__VLS_ctx.feature === 'users') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.users.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [user] of __VLS_getVForSourceType((__VLS_ctx.users))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (user.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge" },
        });
        (user.role);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.user_no);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.username);
    }
}
else if (__VLS_ctx.feature === 'courses') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "workspace-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.courses.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [course] of __VLS_getVForSourceType((__VLS_ctx.courses))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (course.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (course.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (course.description || '无描述');
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
    (__VLS_ctx.feedback.length);
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.feedback))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "feedback-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (item.content);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            placeholder: "回复内容",
        });
        (item.reply);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.feature === 'create-user'))
                        return;
                    if (!!(__VLS_ctx.feature === 'create-course'))
                        return;
                    if (!!(__VLS_ctx.feature === 'dashboard'))
                        return;
                    if (!!(__VLS_ctx.feature === 'users'))
                        return;
                    if (!!(__VLS_ctx.feature === 'courses'))
                        return;
                    __VLS_ctx.reply(item);
                } },
        });
        const __VLS_12 = {}.MessageSquareReply;
        /** @type {[typeof __VLS_components.MessageSquareReply, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            size: (18),
        }));
        const __VLS_14 = __VLS_13({
            size: (18),
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    }
}
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['compact']} */ ;
/** @type {__VLS_StyleScopedClasses['student-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['student-option']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback-item']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MessageSquareReply: MessageSquareReply,
            Plus: Plus,
            RefreshCcw: RefreshCcw,
            UserPlus: UserPlus,
            feature: feature,
            users: users,
            courses: courses,
            feedback: feedback,
            stats: stats,
            userForm: userForm,
            courseForm: courseForm,
            teachers: teachers,
            students: students,
            load: load,
            createUser: createUser,
            createCourse: createCourse,
            toggleStudent: toggleStudent,
            reply: reply,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
