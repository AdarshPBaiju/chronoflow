from rest_framework import serializers

from .models import WorkflowColumn


class WorkflowColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowColumn
        fields = [
            "id",
            "project",
            "name",
            "position",
            "color",
            "is_completed",
            "wip_limit",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        project = data.get("project")
        position = data.get("position")
        if project and position:
            qs = WorkflowColumn.objects.filter(project=project, position=position)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"Position {position} already exists for this project."
                )
        return data
