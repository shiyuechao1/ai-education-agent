from pathlib import Path

from reportlab.pdfgen import canvas

from app.core.config import get_settings
from app.models.entities import ChatSession


def export_chat_session_pdf(session: ChatSession) -> Path:
    export_dir = get_settings().upload_path / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    path = export_dir / f"chat_session_{session.id}.pdf"
    pdf = canvas.Canvas(str(path))
    y = 800
    pdf.setFont("Helvetica", 11)
    pdf.drawString(40, y, f"Chat Session #{session.id} - {session.title}")
    y -= 28
    for message in session.messages:
        text = f"{message.role}: {message.content}"
        for chunk in [text[i : i + 90] for i in range(0, len(text), 90)]:
            if y < 60:
                pdf.showPage()
                pdf.setFont("Helvetica", 11)
                y = 800
            pdf.drawString(40, y, chunk)
            y -= 18
    pdf.save()
    return path
