from app.settings import settings
import re
import ast
import json

from app.api.v1.core.react_agent.agent_reason_runnable import react_agent_runnable, tools
from app.api.v1.core.react_agent.react_state import AgentState

def reason_node(state: AgentState):
    agent_outcome = react_agent_runnable.invoke(state)
    return {"agent_outcome": agent_outcome}


def act_node(state: AgentState):
    agent_action = state["agent_outcome"]
    
    # Extract tool name and input from AgentAction
    tool_name = agent_action.tool
    tool_input = agent_action.tool_input
    
    # Find the matching tool function
    tool_function = None
    for tool in tools:
        if tool.name == tool_name:
            tool_function = tool
            break
    
    # Execute the tool with the properly structured input
    if tool_function:
        # Prepare the input structure as {input: {}}
        structured_input = {"input": {}}
        
        # Process different types of tool_input
        if isinstance(tool_input, dict):
            # If already a dict, wrap it in the required structure
            structured_input["input"] = tool_input
        elif isinstance(tool_input, str):
            # Handle string inputs by parsing them appropriately
            try:
                # Check if input is a string representation of a dictionary
                if (tool_input.startswith('{') and tool_input.endswith('}')) or (tool_input.startswith("{'") and tool_input.endswith("'}")):
                    try:
                        # Try parsing as dictionary using ast.literal_eval (safer than eval)
                        parsed_dict = ast.literal_eval(tool_input)
                        if isinstance(parsed_dict, dict):
                            structured_input["input"] = parsed_dict
                        else:
                            return {"intermediate_steps": [(agent_action, f"Error: Expected dictionary, got {type(parsed_dict)}")]}
                    except Exception as e:
                        # Try with json.loads as a fallback
                        try:
                            # Replace single quotes with double quotes for JSON compatibility
                            json_input = tool_input.replace("'", '"')
                            parsed_dict = json.loads(json_input)
                            if isinstance(parsed_dict, dict):
                                structured_input["input"] = parsed_dict
                            else:
                                return {"intermediate_steps": [(agent_action, f"Error: Expected dictionary, got {type(parsed_dict)}")]}
                        except Exception as json_e:
                            return {"intermediate_steps": [(agent_action, f"Error parsing dictionary input: {str(e)}. JSON error: {str(json_e)}")]}
                
                # Common pattern: "param1=value1, param2=value2"
                elif "=" in tool_input and "," in tool_input:
                    try:
                        # Parse string input into a dictionary
                        parsed_input = {}
                        # Match patterns like: param_name=value
                        pattern = r'([a-zA-Z_]+)=([^,]+)(?:,|$)'
                        matches = re.findall(pattern, tool_input)
                        
                        for key, value in matches:
                            key = key.strip()
                            value = value.strip()
                            
                            # Try to convert value to appropriate type
                            try:
                                if value.lower() == 'true':
                                    parsed_input[key] = True
                                elif value.lower() == 'false':
                                    parsed_input[key] = False
                                elif '.' in value and value.replace('.', '').isdigit():
                                    parsed_input[key] = float(value)
                                elif value.isdigit():
                                    parsed_input[key] = int(value)
                                else:
                                    parsed_input[key] = value
                            except:
                                parsed_input[key] = value
                        
                        # If we successfully parsed params, use them
                        if parsed_input:
                            structured_input["input"] = parsed_input
                        else:
                            # Handle as a simple string if parsing fails
                            structured_input["input"] = {"value": tool_input}
                    except Exception as e:
                        # Fall back to original input if parsing fails
                        return {"intermediate_steps": [(agent_action, f"Error parsing tool input: {str(e)}. Please format your tool input correctly.")]}
                else:
                    # Regular string input - wrap in the structure with a default key
                    structured_input["input"] = {"value": tool_input}
            except Exception as e:
                # Handle any unexpected errors during parsing
                return {"intermediate_steps": [(agent_action, f"Error processing tool input: {str(e)}")]}
        else:
            # For non-string, non-dict inputs (like numbers, booleans, etc.)
            structured_input["input"] = {"value": tool_input}
        
        # Now invoke the tool with the properly structured input
        try:
            output = tool_function.invoke(**structured_input)
            return {"intermediate_steps": [(agent_action, str(output))]}
        except Exception as e:
            return {"intermediate_steps": [(agent_action, f"Error invoking tool: {str(e)}")]}
    else:
        # Tool not found
        return {"intermediate_steps": [(agent_action, f"Tool '{tool_name}' not found")]}