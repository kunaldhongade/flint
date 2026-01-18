import sys
from types import ModuleType

# Ensure google package exists
if 'google' not in sys.modules:
    google = ModuleType('google')
    google.__path__ = []
    sys.modules['google'] = google
else:
    google = sys.modules['google']

# Create google.adk
if 'google.adk' not in sys.modules:
    adk = ModuleType('google.adk')
    adk.__path__ = []
    sys.modules['google.adk'] = adk
    google.adk = adk

# Create google.adk.tools
if 'google.adk.tools' not in sys.modules:
    tools = ModuleType('google.adk.tools')
    tools.__path__ = []
    sys.modules['google.adk.tools'] = tools
    sys.modules['google.adk'].tools = tools

# Mock classes
class MockFunctionTool:
    def __init__(self, *args, **kwargs):
        pass

class MockLongRunningFunctionTool:
    def __init__(self, *args, **kwargs):
        pass

# Create google.adk.tools.function_tool
if 'google.adk.tools.function_tool' not in sys.modules:
    function_tool_mod = ModuleType('google.adk.tools.function_tool')
    sys.modules['google.adk.tools.function_tool'] = function_tool_mod
    sys.modules['google.adk.tools'].function_tool = function_tool_mod
    function_tool_mod.FunctionTool = MockFunctionTool

# Create google.adk.tools.long_running_tool
if 'google.adk.tools.long_running_tool' not in sys.modules:
    long_running_mod = ModuleType('google.adk.tools.long_running_tool')
    sys.modules['google.adk.tools.long_running_tool'] = long_running_mod
    sys.modules['google.adk.tools'].long_running_tool = long_running_mod
    long_running_mod.LongRunningFunctionTool = MockLongRunningFunctionTool
