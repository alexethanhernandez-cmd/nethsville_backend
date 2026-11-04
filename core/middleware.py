from django.conf import settings
from django.http import HttpResponse


class SimpleCorsMiddleware:
    """Pinapayagan ang HTML sa Live Server (127.0.0.1:5500) na tumawag sa API."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get('Origin', '')
        allowed = origin in settings.CORS_ALLOWED_ORIGINS
        if request.method == 'OPTIONS' and allowed:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        if allowed:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Headers'] = 'Content-Type'
            response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
            response['Vary'] = 'Origin'
        return response
