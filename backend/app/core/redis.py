"""
Redis 客户端模块
- Redis 不可用时自动降级（不影响核心功能）
- 提供缓存 / 黑名单 / 限流基础操作
"""
from app.core.config import get_settings

settings = get_settings()

_redis_client = None
_redis_available = False


def _init_redis():
    """惰性初始化 Redis，启动时不强制连接。"""
    global _redis_client, _redis_available
    if _redis_client is not None:
        return
    if not settings.redis_enabled:
        _redis_available = False
        return
    try:
        from redis import Redis
        _redis_client = Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
            socket_connect_timeout=2,
        )
        _redis_client.ping()
        _redis_available = True
    except Exception:
        _redis_available = False


def redis_available() -> bool:
    """当前 Redis 是否可用。"""
    _init_redis()
    return _redis_available


def get_redis():
    """获取 Redis 客户端，不可用时返回 None。"""
    _init_redis()
    return _redis_client if _redis_available else None


# ---------- 缓存操作 ----------

def cache_get(key: str) -> str | None:
    r = get_redis()
    return r.get(key) if r else None


def cache_set(key: str, value: str, ttl_seconds: int = 3600) -> bool:
    r = get_redis()
    if r:
        return r.setex(key, ttl_seconds, value)
    return False


def cache_delete(key: str) -> bool:
    r = get_redis()
    if r:
        return r.delete(key) > 0
    return False


# ---------- 黑名单操作 ----------

def blacklist_add(token: str, ttl_seconds: int = 86400) -> bool:
    """将 token 加入黑名单（登出时调用）。"""
    r = get_redis()
    if r:
        r.setex(f"blacklist:{token}", ttl_seconds, "1")
        return True
    return False


def blacklist_check(token: str) -> bool:
    """检查 token 是否在黑名单中。"""
    r = get_redis()
    if r:
        return r.exists(f"blacklist:{token}") > 0
    return False


# ---------- 限流操作 ----------

def rate_limit_check(key_prefix: str, identifier: str, max_calls: int = 30, window_seconds: int = 60) -> bool:
    """滑动窗口限流：返回 True 表示通过，False 表示超限。

    示例：
        rate_limit_check("api:ask", str(user_id), max_calls=10, window_seconds=60)
    """
    r = get_redis()
    if not r:
        return True  # Redis 不可用时不限流
    key = f"ratelimit:{key_prefix}:{identifier}"
    current = r.incr(key)
    if current == 1:
        r.expire(key, window_seconds)
    return current <= max_calls
