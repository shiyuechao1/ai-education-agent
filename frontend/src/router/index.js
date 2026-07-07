import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AdminView from '../views/AdminView.vue';
import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import StudentView from '../views/StudentView.vue';
import TeacherView from '../views/TeacherView.vue';
import { defaultFeature, hasFeature } from './features';
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/login', component: LoginView },
        {
            path: '/',
            component: DashboardView,
            children: [
                { path: '', redirect: '/login' },
                { path: 'teacher/:feature?', component: TeacherView, meta: { role: 'teacher' } },
                { path: 'student/:feature?', component: StudentView, meta: { role: 'student' } },
                { path: 'admin/:feature?', component: AdminView, meta: { role: 'admin' } }
            ]
        }
    ]
});
router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (auth.token && !auth.user)
        await auth.loadMe();
    if (to.path !== '/login' && !auth.user)
        return '/login';
    if (to.path === '/login' && auth.user)
        return `/${auth.user.role}`;
    if (auth.user && to.path === '/')
        return `/${auth.user.role}/${defaultFeature(auth.user.role)}`;
    const expectedRole = to.meta.role;
    if (auth.user && expectedRole && expectedRole !== auth.user.role) {
        return `/${auth.user.role}/${defaultFeature(auth.user.role)}`;
    }
    if (auth.user && expectedRole === auth.user.role) {
        const feature = String(to.params.feature || '');
        if (!feature || !hasFeature(auth.user.role, feature)) {
            return `/${auth.user.role}/${defaultFeature(auth.user.role)}`;
        }
    }
    return true;
});
export default router;
