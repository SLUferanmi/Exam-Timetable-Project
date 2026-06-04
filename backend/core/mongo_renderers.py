from rest_framework.renderers import JSONRenderer
from rest_framework.utils.encoders import JSONEncoder
from bson import ObjectId

class MongoJSONEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

class MongoJSONRenderer(JSONRenderer):
    encoder_class = MongoJSONEncoder
