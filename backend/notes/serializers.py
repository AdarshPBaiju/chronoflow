from rest_framework import serializers

from .models import Note


class NoteSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ["id", "task", "user", "user_name", "content", "created_at"]
        read_only_fields = ["id", "user", "user_name", "created_at"]

    def get_user_name(self, obj):
        return obj.user.username if obj.user else ""
