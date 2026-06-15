from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="code",
            field=models.CharField(blank=True, max_length=16, null=True, unique=True),
        ),
    ]
